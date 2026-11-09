# SPEC 03 — Acerca de: página `/acerca` con formulario de contacto enviado por Resend

> **Estado:** Aprobado
> **Depende de:** SPEC 02
> **Fecha:** 2026-11-08
> **Objetivo:** Portar la página "Acerca de" de `references/resources/templates/home-about/about.jsx` a `/acerca` y hacer que su formulario de contacto envíe un correo real al equipo mediante Resend.

---

## Por qué existe esta spec

La SPEC 02 dejó fuera la página "Acerca de" y no puso su enlace en el nav para no llevar a la 404.
En la plantilla, el formulario de contacto solo valida que haya texto y muestra la terminal de éxito sin enviar nada.
Esta spec porta la página tal cual y añade el primer código de servidor del proyecto: una Server Action que valida los datos y envía el mensaje con Resend. La API key nunca llega al cliente.

---

## Alcance

**Dentro:**

- Ruta nueva `/acerca` con el mismo contenido y orden que `about.jsx`:

  | Bloque           | Contenido                                                                                           |
  | ---------------- | --------------------------------------------------------------------------------------------------- |
  | Hero             | "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 *highlights* con icono pixel (HEART magenta, BROWSER cyan, PLANT green) |
  | Divisor          | Barra + 24 píxeles parpadeantes + barra (`about-divider`), con *reveal*                             |
  | Contacto         | "▸ CONTACTO", "CONTÁCTANOS", subtítulo, 3 *tips* con LED y el formulario (NOMBRE, CORREO ELECTRÓNICO, MENSAJE, "▶  ENVIAR MENSAJE"), con *reveal* |
  | Éxito            | Terminal "VAULT-OS // TERMINAL" con las líneas `[OK]`, "MENSAJE RECIBIDO… GRACIAS, <NOMBRE>." y botón "ENVIAR OTRO MENSAJE" |

- Envío real del formulario con una **Server Action** que llama a Resend.
- Validación en el servidor sin dependencias (ver Modelo de datos) y, en el cliente, la misma comprobación de campos vacíos que la plantilla (shake sin llamar al servidor).
- Estados nuevos que la plantilla no tiene:
  - **Enviando:** botón deshabilitado con el texto "▶  TRANSMITIENDO…" y campos de solo lectura.
  - **Error de validación:** mensaje bajo cada campo inválido, el formulario conserva lo escrito y hace shake.
  - **Error de envío:** línea "[ERROR] No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos." encima del botón, lo escrito se conserva y el formulario hace shake.
- Honeypot anti-spam: campo oculto `website`; si llega relleno, se responde éxito sin enviar correo.
- Correo al equipo en texto + HTML simple, con `replyTo` = correo del usuario. No hay correo de confirmación al usuario.
- Configuración por variables de entorno (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`) y un `.env.example` versionado.
- Nav (escritorio y panel móvil): enlace "Acerca de" → `/acerca` después de "Salón de la Fama", activo en `/acerca`.
- Estilos de About copiados de `home-about/styles.css` a `app/globals.css`, más tres clases nuevas para los estados nuevos.
- Dependencia nueva: paquete `resend`.

**Fuera de alcance (para specs futuras):**

- Rate limiting, CAPTCHA o cualquier anti-spam más allá del honeypot.
- Correo de confirmación al remitente.
- Plantillas con React Email o diseño neon dentro del correo.
- Guardar los mensajes en base de datos o en `localStorage`.
- Verificar un dominio en Resend (tarea de configuración, no de código).
- Rellenar el nombre o el correo con el usuario mock de `av_user`.
- Enlace a "Acerca de" en el pie.
- Clases `gp-*` y `dp-*` de `home-about/styles.css`.
- Rediseño estético: se replica la plantilla.
- Tests automatizados.

---

## Modelo de datos

### Variables de entorno

Leídas solo en el servidor, nunca con prefijo `NEXT_PUBLIC_`:

| Variable             | Obligatoria | Ejemplo                                   | Uso                                         |
| -------------------- | ----------- | ----------------------------------------- | ------------------------------------------- |
| `RESEND_API_KEY`     | Sí          | `re_xxxxxxxx`                             | Cliente de Resend                           |
| `CONTACT_TO_EMAIL`   | Sí          | `equipo@arcadevault.gg`                   | Destinatario (`to`)                         |
| `CONTACT_FROM_EMAIL` | No          | `Arcade Vault <contacto@arcadevault.gg>`  | Remitente (`from`). Si falta: `Arcade Vault <onboarding@resend.dev>` |

Con `onboarding@resend.dev`, Resend solo entrega al correo de la cuenta Resend; para otro destinatario hace falta un dominio verificado.

`.env.example` (versionado) lista las tres variables vacías. `.env.local` (ignorado) tiene los valores reales.

### Contrato de la Server Action

En `app/lib/contact.ts` (sin `"use server"`, importable desde cliente y servidor):

```ts
export type ContactField = "name" | "email" | "msg";

export type ContactInput = { name: string; email: string; msg: string };

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }                      // name ya con trim
  | { status: "invalid"; fieldErrors: Partial<Record<ContactField, string>> }
  | { status: "error" };                                     // fallo de config o de Resend

export const CONTACT_LIMITS = { name: 80, email: 254, msg: 2000 } as const;

// Aplica trim y devuelve los errores por campo. Objeto vacío = válido.
export function validateContact(input: ContactInput): Partial<Record<ContactField, string>>;
```

Reglas de `validateContact` (tras `trim`):

| Campo   | Regla                                             | Mensaje                                   |
| ------- | ------------------------------------------------- | ----------------------------------------- |
| `name`  | 1–80 caracteres                                   | "Escribe tu nombre (máx. 80)."            |
| `email` | ≤ 254 caracteres y `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | "Escribe un correo válido."               |
| `msg`   | 1–2000 caracteres                                 | "Escribe un mensaje (máx. 2000)."         |

En `app/acerca/actions.ts` (`"use server"`):

```ts
export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState>;
```

1. Lee `name`, `email`, `msg` y `website` de `formData` (`String(... ?? "")`).
2. Si `website` no está vacío → `{ status: "success", name }` sin enviar.
3. `validateContact`; con errores → `{ status: "invalid", fieldErrors }`.
4. Si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL` → `console.error("[contact] Falta la variable <NOMBRE>")` y `{ status: "error" }`.
5. `resend.emails.send({ from, to, replyTo: email, subject, text, html })`. Si devuelve `error` o lanza → `console.error("[contact]", error)` y `{ status: "error" }`.
6. → `{ status: "success", name }`.

### Correo

- **Asunto:** `[Arcade Vault] Contacto de <nombre>`
- **Texto:** `Nombre: …\nCorreo: …\n\n<mensaje>`
- **HTML:** los mismos tres datos en `<p>` y el mensaje en `<p style="white-space:pre-wrap">`. Nombre, correo y mensaje pasan por una función `escapeHtml` (`& < > " '`) en `app/lib/contact.ts`.

No hay datos persistentes nuevos. `av_user` y `av_scores` no cambian.

---

## Plan de implementación

1. **Dependencia y entorno.** `npm install resend`. Crear `.env.example` con las tres variables vacías y añadir `!.env.example` a `.gitignore` (hoy `.env*` lo ignora). Añadir a `CLAUDE.md` una línea sobre las variables de entorno del contacto. Verificación: `git status` muestra `.env.example` como nuevo.
2. **Estilos.** Copiar de `home-about/styles.css` a `app/globals.css` el bloque `/* ===== ABOUT PAGE ===== */` (`.about*`, `.highlight*`, `.div-*`, `@keyframes pxblink`, `.contact-*`, `@keyframes shake`), `.btn.press:active` y `.terminal-success`/`.term-*`. Antes de pegar cada selector, comprobar que no existe ya en `globals.css`. Añadir tres clases nuevas con la paleta existente: `.field-error` (texto magenta, 11 px, mono, bajo el campo), `.form-error` (línea `[ERROR]` en magenta con borde izquierdo, encima del botón) y `.hp-field` (honeypot fuera de pantalla: `position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden`).
3. **Página estática.** Crear `app/components/about-art.tsx` (Server: `HighlightIcon` con los 3 SVG de la plantilla). Crear `app/acerca/page.tsx` (Server Component, `metadata.title` "Acerca de · Arcade Vault") con hero, highlights, divisor y la columna de introducción del contacto. Divisor y sección de contacto usan `<Reveal>` de la SPEC 02 (`as="div"` para el divisor). El formulario es de momento un hueco con el `.contact-form` vacío. Verificación: `/acerca` carga y el *reveal* funciona.
4. **Nav.** En `nav.tsx`, añadir la sección `"acerca"` (activa en `/acerca`) y el enlace "Acerca de" tras "Salón de la Fama" en escritorio y panel móvil (el móvil cierra el panel al pulsarlo).
5. **Validación y correo.** Crear `app/lib/contact.ts` con los tipos, `CONTACT_LIMITS`, `validateContact` y `escapeHtml` (Modelo de datos).
6. **Server Action.** Crear `app/acerca/actions.ts` con `sendContact` siguiendo los 6 pasos del contrato. El cliente de Resend se crea dentro de la función (no en el ámbito del módulo), para que `next build` no falle sin la API key.
7. **Formulario cliente.** Crear `app/components/contact-form.tsx` (`"use client"`) y montarlo en la página:
   - Inputs controlados (`useState`), como la plantilla, con `maxLength` igual a `CONTACT_LIMITS` y `noValidate` en el `<form>` para que todos los errores salgan con el estilo retro.
   - `useActionState(sendContact, { status: "idle" })`. `onSubmit` hace `preventDefault`; si algún campo está vacío tras `trim`, shake y no llama al servidor; si no, construye `new FormData(form)` y llama a la action dentro de `startTransition`.
   - Con `isPending`: botón `disabled` con "▶  TRANSMITIENDO…" e inputs `readOnly`.
   - `invalid` → `.field-error` bajo cada campo con error; `error` → `.form-error`. En ambos casos, shake de 400 ms (el `setTimeout` se limpia en el *cleanup* del efecto).
   - `success` → terminal de la plantilla con `name.toUpperCase()`.
   - "ENVIAR OTRO MENSAJE" remonta el formulario (cambia la `key` del componente interno) para volver a `idle` con los campos vacíos.
   - Honeypot: `<div className="hp-field" aria-hidden="true">` con `<input name="website" tabIndex={-1} autoComplete="off">`.
8. **Prueba real.** Con `.env.local` configurado, enviar un mensaje y comprobar en la bandeja de `CONTACT_TO_EMAIL` asunto, cuerpo y `replyTo`. Sin `RESEND_API_KEY`, comprobar el error en pantalla y el `console.error` en la terminal de `next dev`.
9. **Pulido con `/frontend-design`.** Comparar `/acerca` con la vista About de `home-about/arcade-vault-standalone.html` a 1440 px y 375 px, incluidos los estados de error y enviando. Corregir diferencias visuales sin cambiar la estética.

Cada paso deja la app arrancando con `npm run dev`.

---

## Criterios de aceptación

- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores **sin** `.env.local` y lista `/acerca`.
- [ ] `package.json` incluye `resend` en `dependencies`.
- [ ] `.env.example` está versionado con `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`; `.env.local` no aparece en `git status`.
- [ ] Tras `npm run build`, `grep -r "RESEND_API_KEY\|re_" .next/static` no encuentra la variable ni la key.
- [ ] Ninguna pantalla muestra errores ni avisos de hidratación en la consola del navegador.
- [ ] `/acerca` muestra "ACERCA DE ARCADE VAULT", el párrafo de misión, los 3 highlights, el divisor de 24 píxeles y la sección "CONTÁCTANOS" con los 3 tips, en ese orden.
- [ ] El divisor y la sección de contacto están ocultos al cargar y aparecen con la transición al hacer scroll.
- [ ] El nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de"; "Acerca de" está activo en `/acerca`. El panel móvil incluye "Acerca de" y al pulsarlo navega y se cierra.
- [ ] Enviar con algún campo vacío hace shake y no genera ninguna petición de red.
- [ ] Enviar con correo `jugador@vault` muestra "Escribe un correo válido." bajo el campo, conserva lo escrito y hace shake.
- [ ] Durante el envío el botón dice "▶  TRANSMITIENDO…" y está deshabilitado; un segundo clic no envía otro correo.
- [ ] Con `.env.local` válido, enviar un mensaje muestra la terminal con "GRACIAS, <NOMBRE EN MAYÚSCULAS>." y llega a `CONTACT_TO_EMAIL` un correo con asunto `[Arcade Vault] Contacto de <nombre>`, el nombre, el correo y el mensaje.
- [ ] Responder a ese correo desde el cliente de correo dirige la respuesta al correo que escribió el usuario.
- [ ] Un mensaje con `<b>hola</b>` aparece como texto literal en el correo HTML, no en negrita.
- [ ] Sin `RESEND_API_KEY`, enviar muestra "[ERROR] No se pudo enviar el mensaje…", conserva lo escrito y la terminal de `next dev` muestra `[contact] Falta la variable RESEND_API_KEY`.
- [ ] Rellenar `website` (desde DevTools) y enviar muestra la terminal de éxito y no llega ningún correo.
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario vacío y sin errores.
- [ ] A 375 px no hay scroll horizontal en `/acerca`; highlights y rejilla de contacto pasan a 1 columna.

---

## Decisiones

- **Sí:** ruta `/acerca`. Sigue el criterio de rutas en español de `/acceso` y `/salon`; `/games` fue una excepción puntual de la SPEC 02.
- **No:** `/about` ni `/acerca-de`.
- **Sí:** Server Action con `useActionState`. La API key se queda en el servidor, no hay endpoint público extra y es el patrón nativo de React 19 / Next 16.
- **No:** Route Handler `POST /api/contact`. Solo haría falta si otro cliente consumiera el endpoint.
- **Sí:** remitente, destinatario y key en variables de entorno, con `replyTo` = correo del usuario. Cambiar de `onboarding@resend.dev` a un dominio verificado no requiere tocar código.
- **Sí:** `CONTACT_FROM_EMAIL` opcional con fallback `Arcade Vault <onboarding@resend.dev>`. Permite probar en desarrollo solo con la key y el destinatario.
- **Sí:** validación manual sin dependencias, con límites de longitud. Tres campos no justifican añadir zod.
- **No:** zod, ni validar solo que no estén vacíos (el servidor no puede fiarse del cliente).
- **Sí:** `noValidate` en el formulario. Sin él, el navegador bloquea correos mal formados con su globo nativo antes del estilo retro.
- **Sí:** error inline + shake, conservando lo escrito. El usuario no pierde un mensaje largo por un fallo temporal.
- **No:** terminal de error que oculta el formulario.
- **Sí:** honeypot. Filtra bots básicos sin dependencias ni estado.
- **No:** rate limit en memoria. No es fiable en serverless; un rate limit real irá en su propia spec.
- **Sí:** respuesta de éxito falsa al detectar el honeypot. El bot no aprende que fue filtrado.
- **Sí:** correo en texto + HTML simple con `escapeHtml`. Suficiente para un buzón interno y sin riesgo de inyectar HTML.
- **No:** React Email. Añade dependencias para un correo que solo lee el equipo.
- **No:** correo de confirmación al usuario. Con `onboarding@resend.dev` no se puede enviar a terceros, y el formulario podría usarse para mandar correos a cualquiera.
- **Sí:** botón deshabilitado con "TRANSMITIENDO…" mientras se envía. Evita dobles envíos sin inventar una animación nueva.
- **No:** terminal animada durante la espera; si falla habría que volver atrás desde la terminal.
- **Sí:** sin configuración, error genérico al usuario + `console.error` en el servidor; la página y `next build` funcionan igual. El cliente de Resend se crea dentro de la action para que la build no dependa de la key.
- **No:** fallar al arrancar sin variables (rompe `next build` en CI) ni modo simulado (oculta una mala configuración en producción).
- **Sí:** reutilizar `<Reveal>` de la SPEC 02 en vez del `querySelectorAll(".reveal")` global de la plantilla.
- **Sí:** página como Server Component; solo `contact-form.tsx` y `<Reveal>` son cliente.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Con `onboarding@resend.dev`, Resend rechaza destinatarios distintos del correo de la cuenta | Documentado en `.env.example` y en `CLAUDE.md`; el error se ve en `console.error` y el usuario recibe el mensaje genérico. |
| React 19 resetea los formularios no controlados al terminar una action, y se perdería el texto tras un error | Inputs controlados con `useState` y llamada a la action desde `onSubmit` con `startTransition` (paso 7). Criterio de aceptación específico. |
| Inputs `disabled` no se incluyen en `FormData` | Se usan `readOnly` y el `FormData` se construye antes de que cambie `isPending`. |
| `<Activity>` conserva el estado: al volver a `/acerca` se ve la terminal de éxito del envío anterior | Se acepta: es coherente con "el estado sobrevive a la navegación" y "ENVIAR OTRO MENSAJE" la limpia. El timer del shake se limpia en el *cleanup*. |
| Selectores de `home-about/styles.css` que ya existen en `globals.css` (`.kicker`, `.field`, `@keyframes blink`) | El paso 2 compara antes de pegar; si existe, se conserva el de `globals.css`. |
| El emoji ❤️ de "HECHO CON ❤️ PARA JUGADORES" no existe en Press Start 2P | Se acepta el fallback del sistema, igual que la plantilla; se revisa en el pulido. |
| Spam masivo sin rate limit agota la cuota de Resend | Se acepta por ahora; el honeypot frena los bots simples y el rate limit queda para otra spec. |

---

## Qué **no** entra en esta spec

- Rate limiting, CAPTCHA.
- Correo de confirmación al usuario y plantillas React Email.
- Persistencia de mensajes.
- Verificación de dominio en Resend.
- Autorrelleno con `av_user`.
- Enlace "Acerca de" en el pie.
- Clases `gp-*` y `dp-*`.
- Rediseño visual.
- Tests automatizados.

Cada uno de estos puntos, si llega, irá en su propia spec.
