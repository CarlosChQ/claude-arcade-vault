// Contrato común de los motores de juego reales de Arcade Vault.
// Un motor es TypeScript puro (sin React): dibuja en su canvas a 60 fps y solo
// avisa a React cuando cambian las estadísticas o termina la partida.

import type { AccentColor } from "@/app/data/games";

/** Un hud-stat adicional (líneas, power-up activo…). `tone` colorea el valor. */
export type HudExtra = { label: string; value: string; tone?: AccentColor };

export type GameStats = {
  score: number;
  lives: number | null; // null: el juego no tiene vidas y el HUD oculta los corazones
  level: number;
  extras: HudExtra[]; // hud-stat adicionales, en orden
};

/** Compara dos listas de extras por contenido, no por referencia. */
export function sameExtras(a: HudExtra[], b: HudExtra[]): boolean {
  return (
    a.length === b.length &&
    a.every((x, i) => x.label === b[i].label && x.value === b[i].value && x.tone === b[i].tone)
  );
}

export type EngineEvents = {
  onStats: (stats: GameStats) => void; // solo cuando algún campo cambia, nunca en cada frame
  onGameOver: (finalScore: number) => void; // una sola vez por partida
};

export interface GameEngine {
  start(): void; // arranca el bucle rAF y el input
  pause(): void; // congela la simulación; cancela rAF y quita los listeners de teclado
  resume(): void; // reanuda sin salto de dt (el primer frame tras reanudar usa dt = 0) y vuelve a poner los listeners
  end(): void; // termina la partida (botón FIN) y emite onGameOver
  restart(): void; // partida nueva desde cero
  destroy(): void; // cancela rAF y quita todos los listeners
}

export type CreateEngine = (canvas: HTMLCanvasElement, events: EngineEvents) => GameEngine;
