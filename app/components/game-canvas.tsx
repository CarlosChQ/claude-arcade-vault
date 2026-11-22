"use client";

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import type { CreateEngine, GameEngine, GameStats } from "@/app/lib/games/engine";

/** Lo que GamePlayer puede pedir al motor. start/destroy los gestiona GameCanvas. */
export type GameCanvasHandle = Pick<GameEngine, "pause" | "resume" | "end" | "restart">;

type Props = {
  ref?: Ref<GameCanvasHandle>;
  create: CreateEngine;
  title: string;
  onStats: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
  /** La ruta se ha ocultado (<Activity>) o el componente se ha desmontado: el motor ya está en pausa. */
  onHide: () => void;
};

/**
 * Monta el canvas y su motor. El motor se crea una sola vez y vive en un ref, así que
 * sobrevive a que Next.js oculte la ruta con <Activity>: el cleanup del efecto lo pausa
 * (sin rAF ni listeners) y al volver la partida sigue ahí, en pausa.
 */
export function GameCanvas({ ref, create, title, onStats, onGameOver, onHide }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  // Pausa pendiente del último cleanup; ver el efecto principal.
  const pendingHideRef = useRef<{ cancelled: boolean } | null>(null);

  // El motor llama a estos handlers durante toda su vida: se leen siempre los últimos.
  const handlersRef = useRef({ onStats, onGameOver, onHide });
  useLayoutEffect(() => {
    handlersRef.current = { onStats, onGameOver, onHide };
  });

  useImperativeHandle(
    ref,
    () => ({
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      end: () => engineRef.current?.end(),
      restart: () => engineRef.current?.restart(),
    }),
    [],
  );

  useEffect(() => {
    // Un setup justo después de un cleanup, en la misma tarea, es el remontaje simulado de
    // StrictMode en desarrollo y no una ruta que vuelve a verse: se anula la pausa pendiente.
    if (pendingHideRef.current) {
      pendingHideRef.current.cancelled = true;
      pendingHideRef.current = null;
    }

    const canvas = canvasRef.current;
    if (!engineRef.current && canvas) {
      const engine = create(canvas, {
        onStats: (s) => handlersRef.current.onStats(s),
        onGameOver: (n) => handlersRef.current.onGameOver(n),
      });
      engineRef.current = engine;
      engine.start();
    }

    return () => {
      // Se pausa en un microtask (antes del siguiente frame) para poder anularlo si es StrictMode.
      const pending = { cancelled: false };
      pendingHideRef.current = pending;
      queueMicrotask(() => {
        if (pending.cancelled) return;
        pendingHideRef.current = null;
        engineRef.current?.pause();
        handlersRef.current.onHide();
      });
    };
  }, [create]);

  return <canvas ref={canvasRef} className="game-canvas" role="img" aria-label={`Partida de ${title}`} />;
}
