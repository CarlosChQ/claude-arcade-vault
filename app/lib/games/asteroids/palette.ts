// Colores neón del canvas de Asteroides, diseñados con /frontend-design (paso 6).
// Valores literales de los tokens de app/globals.css: el canvas no puede leer variables CSS.
//
// Concepto: monitor vectorial de fósforo. Cada trazo se pinta dos veces:
//   - glow: el token tal cual, con desenfoque; es lo que sobrevive a las scanlines del CRT.
//   - core: el mismo tono aclarado (nunca blanco), fino, como el centro caliente del haz.
// El fondo no se borra del todo en cada frame (PHOSPHOR_DECAY): lo que se mueve deja una
// estela corta que se apaga sola.

export type NeonTone = { glow: string; core: string };

export const PALETTE = {
  background: "#000", // el CRT de .crt-screen pone el resto
  ship: { glow: "#00f5ff", core: "#b3fcff" }, // --cyan
  thrust: { glow: "#ff006e", core: "#ff8fbd" }, // --magenta
  asteroid: { glow: "#f5ff00", core: "#fbff9e" }, // --yellow
  bullet: { glow: "#e6e9ff", core: "#e6e9ff" }, // --ink (ya es casi blanco: sin aclarar)
  powerUp: { glow: "#00ff88", core: "#9dffcf" }, // --green
} satisfies Record<string, string | NeonTone>;

/** Opacidad del negro que tapa el frame anterior: 1 = sin estela; menos = estela más larga. */
export const PHOSPHOR_DECAY = 0.55;

/** Desenfoque del halo en píxeles lógicos (lienzo 800×600). */
export const GLOW_BLUR = 10;

/** Grosor del trazo principal; el núcleo usa la mitad. 1,5 px del original se perdía entre scanlines. */
export const LINE_WIDTH = 2;
