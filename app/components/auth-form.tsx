"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useUser } from "./use-user";

// Acceso mock: no hay autenticación real ni validación. Enviar el formulario
// guarda el nombre en av_user (vía useUser) y vuelve a la Biblioteca.

type Tab = "in" | "up";

export function AuthForm() {
  const router = useRouter();
  const { login, logout } = useUser();
  const [tab, setTab] = useState<Tab>("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const id = useId();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login({ name: (user || "PLAYER1").toUpperCase().slice(0, 10) });
    router.push("/games");
  };

  const playAsGuest = () => {
    logout();
    router.push("/games");
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="mark"></div>
        <h2 className="neon-cyan">ARCADE VAULT</h2>
        <div className="mono mt-1.5 text-[11px] tracking-[0.16em] text-ink-faint">ACCESO AL SISTEMA · v2.6</div>
      </div>

      <div className="auth-tabs">
        <button type="button" className={tab === "in" ? "on" : ""} onClick={() => setTab("in")}>
          INICIAR SESIÓN
        </button>
        <button type="button" className={tab === "up" ? "on" : ""} onClick={() => setTab("up")}>
          CREAR CUENTA
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor={`${id}-user`}>Usuario</label>
          <input
            id={`${id}-user`}
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="px_kai"
            autoComplete="username"
          />
        </div>
        {tab === "up" && (
          <div className="field slide-in">
            <label htmlFor={`${id}-email`}>Correo electrónico</label>
            <input
              id={`${id}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              autoComplete="email"
            />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${id}-pass`}>Contraseña</label>
          <input
            id={`${id}-pass`}
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            autoComplete={tab === "in" ? "current-password" : "new-password"}
          />
        </div>

        <button className="btn lg mt-2 w-full" type="submit">
          {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
        </button>
      </form>

      <button type="button" className="btn ghost mt-2.5 w-full" onClick={playAsGuest}>
        JUGAR COMO INVITADO
      </button>

      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        <button className="btn ghost" type="button">
          ◆ GOOGLE
        </button>
        <button className="btn ghost" type="button">
          ▣ GITHUB
        </button>
      </div>

      <div className="mt-[18px] text-center text-[11px] tracking-[0.1em] text-ink-faint">
        AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
      </div>
    </div>
  );
}
