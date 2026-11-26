// Teclado de CAÍDA. Escucha en `window` entre attach() y detach().
// Cada keydown de una tecla de juego, incluidos los repetidos del sistema operativo, encola
// una acción: no hay DAS/ARR propios, como en la referencia. El motor vacía la cola al
// principio de cada frame. P y Escape (pausa) son cosa de GamePlayer.

export type Action = "left" | "right" | "rotate" | "softDrop" | "hardDrop";

const KEY_ACTIONS: Record<string, Action> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "rotate",
  KeyX: "rotate",
  ArrowDown: "softDrop",
  Space: "hardDrop",
};

/** true si el evento viene de un campo donde el usuario escribe (p. ej. las iniciales del modal). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export type KeyboardInput = {
  attach(): void;
  /** Quita los listeners y descarta las acciones pendientes. */
  detach(): void;
  /** Devuelve las acciones encoladas desde la última llamada, en orden, y vacía la cola. */
  drain(): Action[];
};

export function createKeyboardInput(): KeyboardInput {
  let queue: Action[] = [];
  let attached = false;

  const onKeyDown = (e: KeyboardEvent) => {
    const action = KEY_ACTIONS[e.code];
    if (!action || isTypingTarget(e.target)) return;
    e.preventDefault(); // flechas y Espacio no hacen scroll
    queue.push(action);
  };

  // Al perder el foco se descartan las acciones que aún no se han aplicado.
  const onBlur = () => {
    queue = [];
  };

  return {
    attach() {
      if (attached) return;
      attached = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("blur", onBlur);
    },
    detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      queue = [];
    },
    drain() {
      const actions = queue;
      queue = [];
      return actions;
    },
  };
}
