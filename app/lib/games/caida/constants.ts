// Constantes de CAÍDA, portadas tal cual de references/started-games/03-tetris/game.js.
// Unidades: píxeles lógicos (lienzo 800×600), celdas del tablero y milisegundos.

// ── Lienzo y bucle ───────────────────────────────────────────────────────────
export const W = 800;
export const H = 600;
export const MAX_DT_MS = 50; // dt máximo por frame

// ── Tablero ──────────────────────────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30; // px por celda: el tablero mide 300×600 y ocupa toda la altura

// Tablero centrado en el lienzo (x 250–550, y 0–600).
export const BOARD_X = (W - COLS * BLOCK) / 2;
export const BOARD_Y = 0;

// ── Panel "SIGUIENTE" (a la derecha del tablero) ─────────────────────────────
// Caja de 4×4 bloques de 30 px, como el canvas de 120×120 de la referencia.
// Posición de partida: se cierra con /frontend-design en el paso 6.
export const NEXT_GRID = 4;
export const NEXT_BLOCK = 30;
export const NEXT_SIZE = NEXT_GRID * NEXT_BLOCK; // 120
export const PANEL_X = BOARD_X + COLS * BLOCK + 40;
export const PANEL_Y = 60; // borde superior de la caja; la etiqueta va encima

// ── Piezas (índice = tipo y color: 1–8) ──────────────────────────────────────
export type Shape = number[][];
export type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const PIECE_COUNT = 8;

export const PIECES: readonly (Shape | null)[] = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

// ── Rotación ─────────────────────────────────────────────────────────────────
export const KICKS = [0, -1, 1, -2, 2] as const; // desplazamientos en x al rotar

// ── Puntuación ───────────────────────────────────────────────────────────────
export const LINE_SCORES = [0, 100, 300, 500, 800] as const; // × nivel
export const SOFT_DROP_POINTS = 1; // por fila
export const HARD_DROP_POINTS = 2; // por celda recorrida

// ── Nivel y velocidad ────────────────────────────────────────────────────────
export const LINES_PER_LEVEL = 10; // nivel = floor(líneas / 10) + 1
export const DROP_START_MS = 1000;
export const DROP_STEP_MS = 90; // por nivel
export const DROP_MIN_MS = 100;

/** Intervalo de caída del nivel: max(100, 1000 − (nivel − 1) × 90) ms. */
export const dropIntervalFor = (level: number) =>
  Math.max(DROP_MIN_MS, DROP_START_MS - (level - 1) * DROP_STEP_MS);

// ── Pieza fantasma ───────────────────────────────────────────────────────────
export const GHOST_ALPHA = 0.2;
