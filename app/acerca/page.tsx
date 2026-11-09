import type { Metadata } from "next";
import { HighlightIcon, type HighlightKind } from "@/app/components/about-art";
import { Reveal } from "@/app/components/reveal";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
};

const HIGHLIGHTS: { i: HighlightKind; t: string; c: "magenta" | "cyan" | "green" }[] = [
  { i: "HEART", t: "HECHO CON ❤️ PARA JUGADORES", c: "magenta" },
  { i: "BROWSER", t: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", c: "cyan" },
  { i: "PLANT", t: "PROYECTO EN CONSTANTE CRECIMIENTO", c: "green" },
];

export default function AcercaPage() {
  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y
          celebrar los arcades que definieron una generación, haciéndolos accesibles para todos, en
          cualquier lugar y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div
              key={h.i}
              className={"highlight " + h.c}
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <HighlightIcon kind={h.i} />
              <div className="hl-text pixel">{h.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divisor */}
      <Reveal as="div" className="about-divider">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </Reveal>

      {/* CONTACT */}
      <Reveal className="about-contact">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar?
              Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led"></span>RESPUESTA EN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS
              </div>
              <div className="tip">
                <span className="tip-led m"></span>SIN SPAM, JAMÁS
              </div>
            </div>
          </div>

          {/* Hueco del formulario: lo ocupa <ContactForm> en el paso 7. */}
          <div className="contact-form"></div>
        </div>
      </Reveal>
    </div>
  );
}
