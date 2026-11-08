"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { formatScore, type Game } from "@/app/data/games";
import { saveScore, useUser } from "./use-user";

// Simulación decorativa de la plantilla: no hay juego real.
// La puntuación sube sola cada TICK_MS mientras no haya pausa ni fin.

const TICK_MS = 220;

type State = {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  saved: boolean;
};

type Action =
  | { type: "tick"; inc: number }
  | { type: "togglePause" }
  | { type: "end" }
  | { type: "saved" }
  | { type: "restart" };

const INITIAL: State = { score: 0, lives: 3, level: 1, paused: false, over: false, saved: false };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "tick": {
      if (state.paused || state.over) return state;
      const score = state.score + action.inc;
      // Misma regla que la plantilla: sube de nivel al pasar cerca de cada múltiplo de 2500.
      const level = score > 0 && score % 2500 < 100 ? state.level + 1 : state.level;
      return { ...state, score, level };
    }
    case "togglePause":
      return { ...state, paused: !state.paused };
    case "end":
      return { ...state, over: true };
    case "saved":
      return { ...state, saved: true };
    case "restart":
      return INITIAL;
  }
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useUser();
  const [state, dispatch] = useReducer(reducer, INITIAL);
  // null = el jugador aún no ha editado el nombre; se usa el de la sesión o "INVITADO".
  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? user?.name ?? "INVITADO";

  const { score, lives, level, paused, over, saved } = state;

  // El intervalo vive en el efecto y se limpia en su cleanup: se detiene al pausar,
  // al terminar y cuando Next.js oculta la ruta con <Activity> al navegar fuera.
  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => dispatch({ type: "tick", inc: Math.floor(10 + Math.random() * 90) }), TICK_MS);
    return () => clearInterval(t);
  }, [over, paused]);

  const onSave = () => {
    saveScore({ game: game.id, score, name });
    dispatch({ type: "saved" });
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{formatScore(score)}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button type="button" className="btn yellow" onClick={() => dispatch({ type: "togglePause" })}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={() => dispatch({ type: "end" })}>
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena" aria-hidden="true">
            <div className="grid-floor"></div>
            <div className="enemy e1"></div>
            <div className="enemy e2"></div>
            <div className="enemy e3"></div>
            <div className="player-ship"></div>
          </div>
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}
                >
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
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setEditedName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                <button type="button" className="btn yellow" onClick={onSave}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={() => dispatch({ type: "restart" })}>
                JUGAR DE NUEVO
              </button>
              <Link href="/" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
