"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUser } from "./use-user";

type Section = "biblioteca" | "salon" | "acceso";

function sectionOf(pathname: string): Section | null {
  if (pathname === "/" || pathname.startsWith("/juegos/")) return "biblioteca";
  if (pathname === "/salon") return "salon";
  if (pathname === "/acceso") return "acceso";
  return null;
}

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);

  const section = sectionOf(pathname);
  const activeClass = (name: Section) => (section === name ? "active" : "");
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={activeClass("biblioteca")}>
            Biblioteca
          </Link>
          <Link href="/salon" className={activeClass("salon")}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button type="button" className="btn ghost auth-btn" onClick={logout}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/acceso" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
        >
          {/* ≡ no está en Press Start 2P: system-ui, como en la plantilla, en vez del
              fallback escalado (Arial al 224 %) de next/font. */}
          <span className="font-[system-ui]">≡</span>
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")} aria-hidden={!open}>
        <div className="pixel neon-cyan mb-4 text-[11px]">
          MENÚ
        </div>
        <Link href="/" className={activeClass("biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={activeClass("salon")} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/acceso" className={activeClass("acceso")} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div className="flex-1"></div>
        <div className="pixel text-[9px] tracking-[0.16em] text-ink-faint">
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
