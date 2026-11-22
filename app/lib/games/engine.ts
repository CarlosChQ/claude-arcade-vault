// Contrato común de los motores de juego reales de Arcade Vault.
// Un motor es TypeScript puro (sin React): dibuja en su canvas a 60 fps y solo
// avisa a React cuando cambian las estadísticas o termina la partida.

export type GameStats = {
  score: number;
  lives: number;
  level: number;
  power: number | null; // segundos restantes del disparo triple, redondeados a 0,1; null si no está activo
};

export type EngineEvents = {
  onStats: (stats: GameStats) => void; // solo cuando algún campo cambia, nunca en cada frame
  onGameOver: (finalScore: number) => void; // una sola vez por partida
};

export interface GameEngine {
  start(): void; // arranca el bucle rAF y el input
  pause(): void; // congela la simulación; deja de leer input de juego
  resume(): void; // reanuda sin salto de dt (el primer frame tras reanudar usa dt = 0)
  end(): void; // termina la partida (botón FIN) y emite onGameOver
  restart(): void; // partida nueva desde cero
  destroy(): void; // cancela rAF y quita todos los listeners
}

export type CreateEngine = (canvas: HTMLCanvasElement, events: EngineEvents) => GameEngine;
