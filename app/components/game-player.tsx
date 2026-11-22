"use client";

import Link from "next/link";
import { Fragment, useEffect, useReducer, useRef, useState, useTransition } from "react";
import { formatScore, type Game } from "@/app/data/games";
import { submitScore } from "@/app/games/[id]/jugar/actions";
import type { GameStats } from "@/app/lib/games/engine";
import { ENGINES } from "@/app/lib/games/registry";
import { GameCanvas, type GameCanvasHandle } from "./game-canvas";
import { useUser } from "./use-user";

// Si el juego tiene un motor registrado en ENGINES, se juega de verdad en un canvas y el
// HUD se alimenta de sus estadísticas. Si no, se mantiene la simulación decorativa de la
// plantilla: la puntuación sube sola cada TICK_MS mientras no haya pausa ni fin.

const TICK_MS = 220;

// Guardado de la puntuación en Supabase desde el modal "FIN DEL JUEGO".
type SaveStatus = "idle" | "saving" | "error" | "saved";

type State = GameStats & {
  paused: boolean;
  over: boolean;
  save: SaveStatus;
};

type Action =
  | { type: "tick"; inc: number }
  | { type: "stats"; stats: GameStats }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "end" }
  | { type: "save"; status: SaveStatus }
  | { type: "restart" };

const INITIAL: State = {
  score: 0,
  lives: 3,
  level: 1,
  power: null,
  paused: false,
  over: false,
  save: "idle",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "tick": {
      if (state.paused || state.over) return state;
      const score = state.score + action.inc;
      // Misma regla que la plantilla: sube de nivel al pasar cerca de cada múltiplo de 2500.
      const level = score > 0 && score % 2500 < 100 ? state.level + 1 : state.level;
      return { ...state, score, level };
    }
    case "stats":
      return { ...state, ...action.stats };
    case "pause":
      return state.paused ? state : { ...state, paused: true };
    case "resume":
      return state.paused ? { ...state, paused: false } : state;
    case "end":
      return state.over ? state : { ...state, over: true };
    case "save":
      return { ...state, save: action.status };
    case "restart":
      return INITIAL;
  }
}

/** Teclas escritas en un campo de texto (p. ej. las iniciales del modal) no controlan el juego. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useUser();
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [, startTransition] = useTransition();
  // null = el jugador aún no ha editado el nombre; se usa el de la sesión o "INVITADO".
  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? user?.name ?? "INVITADO";

  const createEngine = ENGINES[game.id];
  const canvasRef = useRef<GameCanvasHandle>(null);

  const { score, lives, level, power, paused, over, save } = state;

  // Simulación: el intervalo vive en el efecto y se limpia en su cleanup: se detiene al pausar,
  // al terminar y cuando Next.js oculta la ruta con <Activity> al navegar fuera.
  useEffect(() => {
    if (createEngine || over || paused) return;
    const t = setInterval(() => dispatch({ type: "tick", inc: Math.floor(10 + Math.random() * 90) }), TICK_MS);
    return () => clearInterval(t);
  }, [createEngine, over, paused]);

  const pause = () => {
    if (over) return;
    canvasRef.current?.pause();
    dispatch({ type: "pause" });
  };

  const resume = () => {
    if (over) return;
    canvasRef.current?.resume();
    dispatch({ type: "resume" });
  };

  const togglePause = () => (paused ? resume() : pause());

  // Motor: P y Escape alternan la pausa; ocultar la pestaña pausa (sin reanudar sola).
  useEffect(() => {
    if (!createEngine || over) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target)) return;
      if (e.code !== "KeyP" && e.code !== "Escape") return;
      e.preventDefault();
      if (paused) {
        canvasRef.current?.resume();
        dispatch({ type: "resume" });
      } else {
        canvasRef.current?.pause();
        dispatch({ type: "pause" });
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) return;
      canvasRef.current?.pause();
      dispatch({ type: "pause" });
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [createEngine, over, paused]);

  const onEnd = () => {
    // Con motor, end() emite onGameOver y este abre el modal.
    if (createEngine) canvasRef.current?.end();
    else dispatch({ type: "end" });
  };

  const onRestart = () => {
    dispatch({ type: "restart" });
    canvasRef.current?.restart();
  };

  const onSave = () => {
    if (save === "saving" || save === "saved") return;
    dispatch({ type: "save", status: "saving" });
    startTransition(async () => {
      try {
        const result = await submitScore({ gameId: game.id, name, score });
        dispatch({ type: "save", status: result.ok ? "saved" : "error" });
      } catch {
        // Red cortada o servidor caído: la acción ni siquiera respondió.
        dispatch({ type: "save", status: "error" });
      }
    });
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="flex flex-wrap gap-6">
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v text-ink">
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{formatScore(score)}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            {/* ♥ no existe en Press Start 2P: cada corazón se pinta con system-ui, como en la
                plantilla, y no con el fallback escalado que genera next/font. Los espacios
                siguen en la fuente pixel para conservar la separación. */}
            <div className="v">
              {lives > 0
                ? Array.from({ length: lives }, (_, i) => (
                    <Fragment key={i}>
                      {i > 0 && " "}
                      <span className="font-[system-ui]">♥</span>
                    </Fragment>
                  ))
                : "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          {power !== null && (
            <div className="hud-stat power">
              <div className="l">Power</div>
              <div className="v">3x {power.toFixed(1)}s</div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button type="button" className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={onEnd}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {createEngine ? (
            <GameCanvas
              ref={canvasRef}
              create={createEngine}
              title={game.title}
              onStats={(stats) => dispatch({ type: "stats", stats })}
              onGameOver={() => dispatch({ type: "end" })}
              onHide={() => dispatch({ type: "pause" })}
            />
          ) : (
            <div className="game-arena" aria-hidden="true">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content z-5 bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">
                  EN PAUSA
                </div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{formatScore(score)}</div>
            {save !== "saved" ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) => setEditedName(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales"
                    disabled={save === "saving"}
                  />
                  <button
                    type="button"
                    className="btn yellow"
                    onClick={onSave}
                    disabled={save === "saving"}
                  >
                    {save === "saving" ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {save === "error" && (
                  <p className="form-error" role="alert">
                    NO SE PUDO GUARDAR
                  </p>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={onRestart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
