"use server";

import { Resend } from "resend";
import { escapeHtml, validateContact, type ContactState } from "@/app/lib/contact";

const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";

// Server Action del formulario de contacto de /acerca (SPEC 03).
// La API key y las direcciones solo se leen aquí, en el servidor.
export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // 1. Datos del formulario.
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const msg = String(formData.get("msg") ?? "").trim();
  const website = String(formData.get("website") ?? "");

  // 2. Honeypot: éxito falso, sin enviar nada.
  if (website !== "") {
    return { status: "success", name };
  }

  // 3. Validación (el servidor no se fía del cliente).
  const fieldErrors = validateContact({ name, email, msg });
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "invalid", fieldErrors };
  }

  // 4. Configuración.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] Falta la variable RESEND_API_KEY");
    return { status: "error" };
  }
  const to = process.env.CONTACT_TO_EMAIL;
  if (!to) {
    console.error("[contact] Falta la variable CONTACT_TO_EMAIL");
    return { status: "error" };
  }
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;

  // 5. Envío. El cliente se crea aquí, no en el módulo, para que `next build`
  //    no dependa de la API key.
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
      html:
        `<p>Nombre: ${escapeHtml(name)}</p>` +
        `<p>Correo: ${escapeHtml(email)}</p>` +
        `<p style="white-space:pre-wrap">${escapeHtml(msg)}</p>`,
    });
    if (error) {
      console.error("[contact]", error);
      return { status: "error" };
    }
  } catch (error) {
    console.error("[contact]", error);
    return { status: "error" };
  }

  // 6. Éxito.
  return { status: "success", name };
}
