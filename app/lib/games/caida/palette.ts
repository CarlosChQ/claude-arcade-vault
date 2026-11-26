// Colores neón del canvas de CAÍDA, diseñados con /frontend-design (paso 6).
// Valores literales de los tokens de app/globals.css: el canvas no puede leer variables CSS.
//
// Concepto: tubos de neón en un pozo.
//   - Cada bloque es un tubo: contorno del color con halo, relleno del mismo tono translúcido
//     y un reflejo de cristal arriba. Se prerenderiza una vez por color (ver entities.ts).
//   - El pozo es una U abierta por arriba, con un resplandor violeta al fondo que recoge el
//     degradado de la portada `cover-tetro`.
//   - La rejilla son puntos en las intersecciones: las líneas de 0,5 px se perdían entre las
//     scanlines del CRT.

export const PALETTE = {
  background: "#000", // el CRT de .crt-screen pone el resto
  wellGlow: "#2a004a", // fondo del pozo, el mismo violeta que .cover-tetro
  grid: "#4a4f70", // --ink-faint: puntos de la rejilla
  frame: "#ff006e", // --magenta, color de CAÍDA: paredes del pozo y caja del panel
  label: "#8a8fb5", // --ink-dim: texto "SIGUIENTE"
  flash: "#e6e9ff", // --ink: destello de las filas completadas
  highlight: "rgba(255,255,255,0.35)", // reflejo de cristal en el borde superior del bloque
} as const;

/** Color de cada pieza por índice (1–8). El 0 es una celda vacía. */
export const PIECE_COLORS: readonly (string | null)[] = [
  null,
  "#00f5ff", // I  --cyan
  "#f5ff00", // O  --yellow
  "#ff006e", // T  --magenta
  "#00ff88", // S  --green
  "#d97a3a", // Z  --bronze
  "#e6e9ff", // J  --ink
  "#ffcf3a", // L  --gold
  "#c7d0e0", // N  --silver (tuerca)
];

// ── Bloque ───────────────────────────────────────────────────────────────────
/** Opacidad del relleno del tubo; el contorno va al 100 %. */
export const BLOCK_FILL_ALPHA = 0.42;
/** Grosor del contorno del tubo, en px lógicos. */
export const BLOCK_LINE = 2;
/** Halo del contorno, en px lógicos. */
export const BLOCK_GLOW = 9;
/** Alto del reflejo de cristal, en px. */
export const HIGHLIGHT_H = 3;

// ── Pozo y panel ─────────────────────────────────────────────────────────────
export const FRAME_LINE = 2;
export const FRAME_GLOW = 14;
export const PANEL_LINE = 1.5;
export const PANEL_GLOW = 8;
/** Opacidad máxima del resplandor del fondo del pozo. */
export const WELL_GLOW_ALPHA = 0.55;

// ── Rejilla ──────────────────────────────────────────────────────────────────
export const GRID_ALPHA = 0.7;
/** Lado de cada punto de la rejilla, en px. */
export const GRID_DOT = 2;

// ── Destello ─────────────────────────────────────────────────────────────────
/** Duración del destello al completar líneas; se apaga con ease-out. */
export const FLASH_MS = 240;
export const FLASH_GLOW = 18;
