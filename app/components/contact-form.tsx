"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useState,
  type FormEvent,
} from "react";
import { sendContact } from "@/app/acerca/actions";
import { CONTACT_LIMITS, type ContactState } from "@/app/lib/contact";

// Formulario de contacto de /acerca (SPEC 03), portado de home-about/about.jsx.
//
// - Inputs controlados: React 19 resetea los formularios no controlados al terminar
//   una action, y tras un error se perdería lo escrito.
// - La action se llama desde onSubmit dentro de startTransition, con el FormData
//   construido antes de que cambie isPending (los campos pasan a readOnly, no a
//   disabled, que no entraría en el FormData).
// - "ENVIAR OTRO MENSAJE" cambia la `key` del formulario interno: se remonta y
//   vuelve a idle con los campos vacíos.

const INITIAL_STATE: ContactState = { status: "idle" };
const EMPTY_FORM = { name: "", email: "", msg: "" };
const SHAKE_MS = 400;

export function ContactForm() {
  const [instance, setInstance] = useState(0);
  return <ContactFormInner key={instance} onReset={() => setInstance((n) => n + 1)} />;
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [state, formAction, isPending] = useActionState(sendContact, INITIAL_STATE);
  const [shaking, setShaking] = useState(false);
  const id = useId();

  // Shake cuando llega una respuesta invalid/error del servidor. Se ajusta el estado
  // durante el render (patrón "estado previo"), no en un efecto.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "invalid" || state.status === "error") setShaking(true);
  }

  // El timer del shake se limpia en el cleanup: con <Activity> el efecto se limpia
  // al salir de la ruta y vuelve a arrancar al volver.
  useEffect(() => {
    if (!shaking) return;
    const t = setTimeout(() => setShaking(false), SHAKE_MS);
    return () => clearTimeout(t);
  }, [shaking]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShaking(true);
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  const errId = (field: string) => `${id}-${field}-error`;

  return (
    <form
      className={"contact-form" + (shaking ? " shake" : "")}
      onSubmit={onSubmit}
      noValidate
    >
      {state.status !== "success" ? (
        <>
          <div className="field">
            <label htmlFor={`${id}-name`}>NOMBRE</label>
            <input
              id={`${id}-name`}
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
              maxLength={CONTACT_LIMITS.name}
              autoComplete="name"
              readOnly={isPending}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? errId("name") : undefined}
            />
            {fieldErrors.name && (
              <span id={errId("name")} className="field-error">
                {fieldErrors.name}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor={`${id}-email`}>CORREO ELECTRÓNICO</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
              maxLength={CONTACT_LIMITS.email}
              autoComplete="email"
              readOnly={isPending}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? errId("email") : undefined}
            />
            {fieldErrors.email && (
              <span id={errId("email")} className="field-error">
                {fieldErrors.email}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor={`${id}-msg`}>MENSAJE</label>
            <textarea
              id={`${id}-msg`}
              name="msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
              maxLength={CONTACT_LIMITS.msg}
              readOnly={isPending}
              aria-invalid={fieldErrors.msg ? true : undefined}
              aria-describedby={fieldErrors.msg ? errId("msg") : undefined}
            ></textarea>
            {fieldErrors.msg && (
              <span id={errId("msg")} className="field-error">
                {fieldErrors.msg}
              </span>
            )}
          </div>

          {/* Honeypot: invisible para personas, los bots lo rellenan. */}
          <div className="hp-field" aria-hidden="true">
            <input name="website" tabIndex={-1} autoComplete="off" />
          </div>

          {state.status === "error" && (
            <p className="form-error" role="alert">
              [ERROR] No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.
            </p>
          )}

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={isPending}
          >
            {isPending ? "▶  TRANSMITIENDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="status">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
