// Colores neón del canvas de Asteroides.
// Valores literales de los tokens de app/globals.css: el canvas no puede leer variables CSS.
// La combinación final y la intensidad del glow se cierran en el paso 6 con /frontend-design.

export const PALETTE = {
  background: "#000", // el CRT de .crt-screen pone el resto
  ship: "#00f5ff", // --cyan
  thrust: "#ff006e", // --magenta
  asteroid: "#f5ff00", // --yellow
  bullet: "#e6e9ff", // --ink
  powerUp: "#00ff88", // --green
} as const;
