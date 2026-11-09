// Contrato del formulario de contacto de /acerca (SPEC 03).
// Sin "use server": lo importan tanto la Server Action como el formulario cliente.

export type ContactField = "name" | "email" | "msg";

export type ContactInput = { name: string; email: string; msg: string };

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string } // name ya con trim
  | { status: "invalid"; fieldErrors: Partial<Record<ContactField, string>> }
  | { status: "error" }; // fallo de config o de Resend

export const CONTACT_LIMITS = { name: 80, email: 254, msg: 2000 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Aplica trim y devuelve los errores por campo. Objeto vacío = válido.
export function validateContact(input: ContactInput): Partial<Record<ContactField, string>> {
  const name = input.name.trim();
  const email = input.email.trim();
  const msg = input.msg.trim();
  const errors: Partial<Record<ContactField, string>> = {};

  if (name.length < 1 || name.length > CONTACT_LIMITS.name) {
    errors.name = "Escribe tu nombre (máx. 80).";
  }
  if (email.length > CONTACT_LIMITS.email || !EMAIL_RE.test(email)) {
    errors.email = "Escribe un correo válido.";
  }
  if (msg.length < 1 || msg.length > CONTACT_LIMITS.msg) {
    errors.msg = "Escribe un mensaje (máx. 2000).";
  }

  return errors;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Escapa & < > " ' para insertar texto del usuario en el HTML del correo.
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}
