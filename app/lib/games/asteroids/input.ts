// Teclado de Asteroides. Escucha en `window` entre attach() y detach().
// Solo gestiona las teclas de juego; P y Escape (pausa) son cosa de GamePlayer.

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

/** true si el evento viene de un campo donde el usuario escribe (p. ej. las iniciales del modal). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export type KeyboardInput = {
  attach(): void;
  detach(): void;
  /** Con false se sueltan todas las teclas y se ignoran las nuevas (pausa, fin de partida). */
  setEnabled(enabled: boolean): void;
  isDown(code: string): boolean;
  /** true una sola vez por pulsación (como `pressed()` del original). */
  consumePress(code: string): boolean;
};

export function createKeyboardInput(): KeyboardInput {
  const down = new Set<string>();
  const pressed = new Set<string>();
  let enabled = true;
  let attached = false;

  const clear = () => {
    down.clear();
    pressed.clear();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!enabled || !GAME_KEYS.has(e.code) || isTypingTarget(e.target)) return;
    e.preventDefault(); // flechas y Espacio no hacen scroll
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    down.delete(e.code);
  };

  // Al perder el foco no llega el keyup: sin esto la nave seguiría girando al volver.
  const onBlur = () => clear();

  return {
    attach() {
      if (attached) return;
      attached = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", onBlur);
    },
    detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      clear();
    },
    setEnabled(value) {
      enabled = value;
      if (!value) clear();
    },
    isDown(code) {
      return down.has(code);
    },
    consumePress(code) {
      return pressed.delete(code);
    },
  };
}
