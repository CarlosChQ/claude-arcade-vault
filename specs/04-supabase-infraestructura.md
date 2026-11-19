# SPEC 04 — Supabase: infraestructura base en Next.js

> **Estado:** Aprobado
> **Depende de:** SPEC 03
> **Fecha:** 2026-11-18
> **Objetivo:** Conectar la app al proyecto Supabase con clientes tipados de servidor y navegador, variables de entorno documentadas y una ruta `/api/health/supabase` que confirma la conexión, sin cambiar ninguna pantalla.

---

## Por qué existe esta spec

La sesión (`av_user`) y las puntuaciones (`av_scores`) siguen siendo mock en `localStorage` (`app/components/use-user.ts`).
Antes de sustituirlas por auth y datos reales, la app necesita una base común: paquetes, clientes, variables de entorno y tipos.
Esta spec deja esa base lista y comprobable. Auth y puntuaciones irán en specs propias que la reutilizan.

El proyecto Supabase ya está vinculado al MCP en `.mcp.json` (`project_ref=drsthviyneavhbltolwk`) y hoy no tiene tablas en `public`.

---

## Alcance

**Dentro:**

- Dependencias nuevas: `@supabase/supabase-js` y `@supabase/ssr`.
- `app/lib/supabase/server.ts`: `createClient()` asíncrono para Server Components, Server Actions y Route Handlers, con las cookies de `next/headers`.
- `app/lib/supabase/client.ts`: `createClient()` para Client Components con `createBrowserClient`.
- `app/lib/supabase/env.ts`: lectura y comprobación de las dos variables públicas.
- `app/lib/supabase/database.types.ts`: tipos generados del esquema (vacío por ahora) y versionados. Ambos clientes se tipan con `Database`.
- Route Handler `GET /api/health/supabase` que comprueba que la URL y la clave responden.
- `.env.template`: bloque nuevo con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `CLAUDE.md`: líneas sobre las variables de Supabase, la ruta de salud y cómo regenerar los tipos.

**Fuera de alcance (para specs futuras):**

- `proxy.ts` para refrescar la cookie de sesión. Irá con la spec de auth.
- Autenticación real y cambios en `/acceso` o `use-user.ts`.
- Tablas, RLS y puntuaciones en base de datos. `av_user` y `av_scores` no cambian.
- Clave secreta (`SUPABASE_SECRET_KEY`) o cliente admin.
- Ficheros de migración en el repo y stack local con Supabase CLI.
- Cualquier cambio visual. No hay UI nueva, así que no aplica `/frontend-design`.
- Tests automatizados.

---

## Modelo de datos

No hay tablas, datos persistentes ni estructuras de dominio nuevas. Lo nuevo es configuración y contratos de módulo.

### Variables de entorno

| Variable                                | Obligatoria | Ejemplo                                    | Uso                              |
| --------------------------------------- | ----------- | ------------------------------------------ | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | Sí          | `https://drsthviyneavhbltolwk.supabase.co` | URL del proyecto                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Sí          | `sb_publishable_xxxxxxxx`                  | Clave pública de ambos clientes  |

Las dos llevan el prefijo `NEXT_PUBLIC_` porque el cliente de navegador las necesita. La publishable key es pública por diseño: la seguridad de los datos dependerá de RLS en las specs que creen tablas.
Los valores se obtienen con las herramientas MCP `get_project_url` y `get_publishable_keys`, o desde el dashboard (Project Settings → API Keys).

### `app/lib/supabase/env.ts`

```ts
export type SupabaseEnv = { url: string; publishableKey: string };

// Devuelve null si falta alguna variable. No lanza: quien la llama decide.
export function getSupabaseEnv(): SupabaseEnv | null;
```

Lee `process.env.NEXT_PUBLIC_SUPABASE_URL` y `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con acceso literal (sin desestructurar), para que Next.js pueda insertarlas en el bundle del navegador.

### Clientes

```ts
// app/lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;

// app/lib/supabase/client.ts  ("use client" no hace falta: es un módulo, no un componente)
export function createClient(): SupabaseClient<Database>;
```

- Si `getSupabaseEnv()` devuelve `null`, ambos lanzan `Error("[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")`.
- Los clientes se crean al llamar a la función, nunca en el ámbito del módulo, para que `next build` funcione sin variables.
- `server.ts` usa `createServerClient` con `cookies: { getAll, setAll }`. `setAll` va en `try/catch`, porque un Server Component no puede escribir cookies. Ese caso dejará de importar cuando el `proxy.ts` de la spec de auth refresque la sesión.

### `app/lib/supabase/database.types.ts`

Generado con la herramienta MCP `generate_typescript_types` y versionado tal cual sale. Exporta `Database`. No se edita a mano. Se regenera tras cada cambio de esquema.

### Contrato de `GET /api/health/supabase`

Fichero `app/api/health/supabase/route.ts`.

| Caso                                            | HTTP  | Cuerpo                                  |
| ----------------------------------------------- | ----- | --------------------------------------- |
| Supabase responde con la URL y la clave         | `200` | `{ "ok": true }`                        |
| Falta alguna variable                           | `503` | `{ "ok": false, "error": "config" }`    |
| Clave rechazada, red caída o respuesta no 2xx   | `503` | `{ "ok": false, "error": "connection" }` |

- Siempre con la cabecera `Cache-Control: no-store`.
- Llama a `await connection()` (de `next/server`) al principio, para que la ruta sea dinámica con `cacheComponents` y no se prerenderice en la build.
- Comprobación: `fetch` a `${url}/auth/v1/health` con la cabecera `apikey: publishableKey` y un timeout de 5 s (`AbortSignal.timeout(5000)`). Ese endpoint valida la clave y no necesita tablas.
- En los casos de error, `console.error("[supabase-health]", motivo)` en el servidor. El cuerpo nunca incluye la URL, la clave ni el mensaje del error.

---

## Plan de implementación

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr`. Verificación: aparecen en `dependencies` y `npm run dev` arranca.
2. **Entorno.** Añadir a `.env.template` el bloque de Supabase con las dos variables vacías y un comentario sobre dónde obtenerlas. Poner los valores reales en `.env.local`, obtenidos con `get_project_url` y `get_publishable_keys`. Verificación: `git status` muestra solo `.env.template` modificado.
3. **Tipos.** Generar `app/lib/supabase/database.types.ts` con `generate_typescript_types`. Verificación: `npx tsc --noEmit` pasa.
4. **Lectura de entorno.** Crear `app/lib/supabase/env.ts` con `getSupabaseEnv()`.
5. **Cliente de servidor.** Crear `app/lib/supabase/server.ts` según el contrato. Antes de escribirlo, leer en `node_modules/next/dist/docs/` la referencia de `cookies`.
6. **Cliente de navegador.** Crear `app/lib/supabase/client.ts` según el contrato. Todavía no lo importa ningún componente.
7. **Ruta de salud.** Crear `app/api/health/supabase/route.ts` según el contrato. Antes, leer en `node_modules/next/dist/docs/` las guías de Route Handlers y `connection`. Verificación: `curl -i http://localhost:3000/api/health/supabase` devuelve `200 {"ok":true}`.
8. **Documentación.** Añadir a `CLAUDE.md` un párrafo con las dos variables, la ruta de salud y la regla de regenerar `database.types.ts` con `generate_typescript_types` tras cambiar el esquema.

Cada paso deja la app arrancando con `npm run dev`.

---

## Criterios de aceptación

- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`.
- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores **sin** `.env.local`, y lista `/api/health/supabase` como ruta dinámica (`ƒ`).
- [ ] `.env.template` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vacías; `.env.local` no aparece en `git status`.
- [ ] `app/lib/supabase/database.types.ts` está versionado y exporta `Database`; `server.ts` y `client.ts` devuelven `SupabaseClient<Database>`.
- [ ] Con `.env.local` válido, `GET /api/health/supabase` devuelve `200` con `{"ok":true}` y `Cache-Control: no-store`.
- [ ] Sin las variables, la ruta devuelve `503` con `{"ok":false,"error":"config"}`.
- [ ] Con una publishable key alterada, la ruta devuelve `503` con `{"ok":false,"error":"connection"}` y la terminal de `next dev` muestra una línea `[supabase-health]`.
- [ ] Ninguna respuesta de la ruta contiene la URL del proyecto ni la clave.
- [ ] `/`, `/games`, `/salon`, `/acceso` y `/acerca` se ven y funcionan igual que antes; `use-user.ts` no cambia.
- [ ] No existe `proxy.ts` ni `middleware.ts` en el repo.
- [ ] `CLAUDE.md` documenta las variables de Supabase, la ruta de salud y cómo regenerar los tipos.

---

## Decisiones

- **Sí:** solo infraestructura en esta spec. Auth y puntuaciones son dominios grandes y cada uno irá en su propia spec.
- **No:** juntar infraestructura, auth y puntuaciones en una spec.
- **Sí:** `@supabase/ssr` con un cliente de servidor por cookies y otro de navegador. Es el patrón oficial para App Router y el que necesitará la spec de auth.
- **No:** usar solo `@supabase/supabase-js` con un cliente global; no sirve para sesiones por usuario en el servidor.
- **No:** `proxy.ts` todavía. Sin login no hay sesión que refrescar, y añadiría una llamada a Supabase en cada petición sin beneficio.
- **Sí:** clientes en `app/lib/supabase/`. Sigue la convención de `app/lib/contact.ts`.
- **No:** `lib/supabase/` en la raíz.
- **Sí:** publishable key (`sb_publishable_…`) con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Es el formato actual de Supabase.
- **No:** anon key legacy, ni clave secreta o cliente admin (no hacen falta sin tablas ni auth).
- **Sí:** esquema gestionado solo vía MCP o dashboard, sin migraciones en el repo. Es una decisión del usuario.
- **No:** `supabase/migrations/*.sql` ni stack local con Docker.
- **Sí:** tipos generados y versionados en `database.types.ts`, aunque hoy el esquema esté vacío. Las specs siguientes solo los regeneran.
- **Sí:** ruta `/api/health/supabase` para comprobar la conexión, útil también en producción.
- **No:** prueba manual sin código ni script npm.
- **Sí:** la ruta de salud consulta `/auth/v1/health` con la clave. Valida URL y clave sin depender de que existan tablas o funciones.
- **No:** consultar una tabla inexistente e interpretar el error de PostgREST; es frágil y engañoso.
- **Sí:** sin variables, la build pasa, los clientes lanzan un error claro al usarse y la ruta responde `503 config`. Igual que el criterio de Resend en la SPEC 03.
- **No:** fallar al arrancar sin variables (rompe `next build` en CI).

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Las variables `NEXT_PUBLIC_*` se insertan en el bundle del navegador **en la build**: cambiarlas en producción exige reconstruir | Documentado en `.env.template` y en `CLAUDE.md`. |
| Desestructurar `process.env` impide que Next.js inserte las variables en el cliente | `env.ts` las lee con acceso literal (Modelo de datos). |
| Con `cacheComponents`, un Route Handler `GET` sin datos dinámicos se prerenderiza y la salud quedaría congelada en la build | `await connection()` al inicio de la ruta; criterio de aceptación que exige `ƒ` en la salida de la build. |
| `database.types.ts` desfasado tras cambiar el esquema desde el dashboard | Regla en `CLAUDE.md`: regenerar con `generate_typescript_types` tras cada cambio de esquema. |
| Al no haber migraciones en el repo, el esquema no es reproducible desde Git | Aceptado por decisión del usuario; se revisará si aparecen entornos de staging o ramas de Supabase. |
| La API de `@supabase/ssr` o de `cookies()` cambia respecto a lo conocido | Los pasos 5 y 7 obligan a leer la documentación incluida antes de escribir el código. |

---

## Qué **no** entra en esta spec

- `proxy.ts` y refresco de sesión.
- Autenticación real y cambios en `/acceso` o `use-user.ts`.
- Tablas, RLS y puntuaciones en Supabase.
- Clave secreta y cliente admin.
- Migraciones en el repo y stack local.
- Cambios visuales.
- Tests automatizados.

Cada uno de estos puntos, si llega, irá en su propia spec.
