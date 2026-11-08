"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";

// Animación "reveal" de la Home: la sección aparece al entrar en pantalla.
// A diferencia de la plantilla (querySelectorAll(".reveal") global), cada <Reveal>
// observa solo su propio elemento, así no toca nodos de rutas ocultas por <Activity>.
//
// Con <Activity> el efecto se limpia al salir de la ruta y se re-ejecuta al volver:
// `shown` se conserva y la clase `in` no se quita nunca, de modo que una sección ya
// revelada sigue visible y el efecto no vuelve a observarla.

type RevealProps = {
  as?: "section" | "div";
  className?: string;
  children: ReactNode;
};

export function Reveal({ as: Tag = "section", className, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  const classes = [className, "reveal", shown && "in"].filter(Boolean).join(" ");

  return (
    <Tag ref={ref as Ref<HTMLDivElement>} className={classes}>
      {children}
    </Tag>
  );
}
