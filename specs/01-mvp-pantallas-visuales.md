# SPEC 01 — MVP visual: las 5 pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-11-07
> **Objetivo:** Portar a rutas del App Router las 5 pantallas de la plantilla `references/resources/templates/` (Biblioteca, Detalle, Reproductor, Acceso y Salón de la Fama) con datos ficticios y sin ningún juego real.

---

## Por qué existe esta spec

La plantilla es un prototipo React 18 de una sola página, con un router por hash y scripts Babel en el navegador.
El repo ya tiene portados los estilos (`app/globals.css`) y las fuentes (`app/layout.tsx`), pero `app/page.tsx` sigue siendo el placeholder de `create-next-app`.
Esta spec convierte el prototipo en una app Next.js 16 navegable, que sirve de base visual para las specs que añadan juegos, backend y puntuaciones reales.

---

## Alcance

**Dentro:**

- Cinco rutas del App Router, una por pantalla de la plantilla:

  | Ruta                  | Pantalla           | Plantilla de origen |
  | --------------------- | ------------------ | ------------------- |
  | `/`                   | Biblioteca         | `biblioteca.jsx`    |
  | `/juegos/[id]`        | Detalle del juego  | `detalle.jsx`       |
  | `/juegos/[id]/jugar`  | Reproductor        | `reproductor.jsx`   |
  | `/acceso`             | Iniciar sesión / Crear cuenta | `auth.jsx` |
  | `/salon`              | Salón de la Fama   | `salon.jsx`         |

- Navegación superior (`nav.jsx`) y pie (`app.jsx`) compartidos en `app/layout.tsx`, incluido el panel móvil con hamburguesa.
- Datos ficticios en `app/data/games.ts`: los 8 juegos, las categorías, los jugadores y el generador determinista `seededScores`.
- Biblioteca: búsqueda por nombre, chips de categoría, efecto *tilt* de las tarjetas y estado "NO HAY RESULTADOS".
- Detalle: portada, etiquetas, estadísticas y tabla de 10 mejores puntuaciones generadas con `seededScores`.
- Reproductor con la **simulación completa** de la plantilla: puntuación que sube sola cada 220 ms, subida de nivel, pausa/reanudar, arena animada decorativa, botón FIN y modal "FIN DEL JUEGO" con guardar puntuación y jugar de nuevo.
- Acceso: pestañas Iniciar sesión / Crear cuenta, campo de correo solo en Crear cuenta, botón "Jugar como invitado" y botones sociales decorativos.
- Salón de la Fama: pestañas por juego, podio top 3, tabla de 12 filas y fila "TU MEJOR MARCA" cuando hay usuario.
- Sesión y puntuaciones **mock** en `localStorage` con las mismas claves que la plantilla (`av_user`, `av_scores`).
- Página 404 temática (`app/not-found.tsx`) para ids de juego inexistentes y rutas desconocidas.
- Reemplazo de `app/page.tsx` placeholder y del contenido de plantilla de `create-next-app`.

**Fuera de alcance (para specs futuras):**

- Cualquier juego jugable. La arena del Reproductor es decorativa.
- Autenticación real, validación de formularios, OAuth con Google/GitHub.
- Backend, base de datos o API. Los datos ficticios se leen de `app/data/games.ts`.
- Que las puntuaciones guardadas en `av_scores` aparezcan en Detalle o en el Salón (se guardan pero no se leen).
- Sistema de créditos: "CRÉDITOS · 03" es texto fijo.
- Menú desplegable de usuario: pulsar el nombre cierra sesión directamente, como en la plantilla.
- Rediseño estético: se replica la plantilla tal cual.
- Tests automatizados (el repo no tiene test runner).

---

## Modelo de datos

Todo vive en `app/data/games.ts`. Los valores se copian literalmente de `references/resources/templates/data.jsx`.

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;          // slug usado en la URL: "bloque-buster", "caida", ...
  title: string;
  short: string;       // descripción de tarjeta
  long: string;        // descripción de detalle
  cat: Category;
  cover: string;       // clase CSS de portada: "cover-bricks", "cover-tetro", ...
  color: AccentColor;
  best: number;
  plays: string;       // "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/2026"

export const GAMES: Game[];                      // 8 juegos, mismo orden que la plantilla
export const CATS: ("TODOS" | Category)[];        // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[];                   // 18 alias

export function seededScores(seed: number, count?: number): ScoreRow[]; // mismo algoritmo LCG de la plantilla
export function formatScore(n: number): string;   // única fuente de formato es-ES: 28450 → "28.450"

// Acceso async para que el cambio futuro a base de datos no toque los componentes.
export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | undefined>;
```

Semillas (iguales a la plantilla, para que los rankings coincidan):

- Detalle: `seededScores(id.length * 17 + 3, 10)`.
- Salón: `seededScores(id.length * 23 + 7, 12)`.

Persistencia mock en `localStorage` (sin versión, igual que la plantilla):

```ts
// "av_user"   → { name: string } | ausente      (name en mayúsculas, máx. 10 caracteres, por defecto "PLAYER1")
// "av_scores" → { game: string; score: number; name: string; at: number }[]
```

El acceso a `av_user` se centraliza en un hook cliente `useUser()` en `app/components/use-user.ts`.
Expone `{ user, login(user), logout() }` y notifica a todos los componentes montados (nav, salón, reproductor) cuando cambia.

---

## Plan de implementación

1. **Datos.** Crear `app/data/games.ts` con tipos, `GAMES`, `CATS`, `PLAYERS`, `seededScores`, `getGames` y `getGame`. Verificación: `npx next typegen && npx tsc --noEmit` pasa.
2. **Sesión mock.** Crear `app/components/use-user.ts` (`"use client"`) con `useSyncExternalStore` sobre `av_user`, snapshot de servidor `null` y un evento propio para notificar cambios en la misma pestaña. Añadir `saveScore(entry)` que hace *append* en `av_scores` con `at: Date.now()`, tolerando fallos de `localStorage`.
3. **Shell.** Crear `app/components/nav.tsx` (cliente: `usePathname` para el enlace activo, panel móvil, botón de usuario/login) y `app/components/footer.tsx`. Montarlos en `app/layout.tsx` alrededor de `<main className="av-main">`. "Biblioteca" queda activa en `/`, `/juegos/[id]` y `/juegos/[id]/jugar`.
4. **Biblioteca.** Reemplazar `app/page.tsx` por la Biblioteca. El hero es servidor. La búsqueda, los chips y la rejilla van en `app/components/library.tsx` (cliente). La tarjeta con *tilt* va en `app/components/game-card.tsx`. Clic en tarjeta o en JUGAR navega a `/juegos/[id]`. Borrar `public/next.svg` y `public/vercel.svg` si ya no se usan.
5. **404.** Crear `app/not-found.tsx` con estilo arcade ("GAME OVER · 404") y enlace a `/`.
6. **Detalle.** Crear `app/juegos/[id]/page.tsx` (Server Component) con `generateStaticParams` desde `GAMES`. Si `getGame(id)` no existe, `notFound()`. Botones "JUGAR AHORA" → `/juegos/[id]/jugar` y "VOLVER AL VAULT" → `/`.
7. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` (servidor, `generateStaticParams`, `notFound()`) que renderiza `app/components/game-player.tsx` (cliente) con el juego. Portar la simulación: intervalo de 220 ms limpiado en el *cleanup* del efecto, pausa, FIN, modal con nombre (mayúsculas, máx. 10), `saveScore`, "JUGAR DE NUEVO" reinicia, "SALIR" → `/juegos/[id]`, "VOLVER AL VAULT" → `/`. Nombre inicial: `user.name` o `"INVITADO"`.
8. **Acceso.** Crear `app/acceso/page.tsx` + `app/components/auth-form.tsx` (cliente). Enviar el formulario llama a `login({ name })` y navega a `/`. "JUGAR COMO INVITADO" llama a `logout()` y navega a `/`. Google/GitHub no hacen nada.
9. **Salón de la Fama.** Crear `app/salon/page.tsx` + `app/components/hall-of-fame.tsx` (cliente: pestaña activa en estado, `useUser`). Podio, tabla con `animationDelay` escalonado y fila "TU MEJOR MARCA" con el cálculo de la plantilla cuando hay usuario.
10. **Pulido con `/frontend-design`.** Revisar las cinco pantallas contra la plantilla abierta en el navegador. Sustituir los `style={{}}` inline de la plantilla por utilidades Tailwind o clases existentes. Corregir diferencias visuales sin cambiar la estética.

Cada paso deja la app arrancando con `npm run dev`; las rutas aún no creadas simplemente devuelven la 404.

---

## Criterios de aceptación

- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de prerender y lista `/`, `/acceso`, `/salon` y las 8 rutas `/juegos/[id]` y `/juegos/[id]/jugar`.
- [ ] Ninguna pantalla muestra errores ni avisos de hidratación en la consola del navegador.
- [ ] `/` muestra 8 tarjetas; escribir "caí" deja solo CAÍDA ("ca" también deja ROCAS, igual que en la plantilla); el chip SHOOTER deja solo INVASORES y ROCAS; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta de la Biblioteca lleva a `/juegos/<id>` de ese juego.
- [ ] `/juegos/caida` muestra título, descripción larga, 3 estadísticas y 10 filas de puntuación ordenadas de mayor a menor.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la 404 temática con enlace a la Biblioteca.
- [ ] En `/juegos/caida/jugar` la puntuación sube sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la reanuda.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN añade una entrada a `av_scores` y muestra "PUNTUACIÓN GUARDADA"; JUGAR DE NUEVO pone la puntuación a 0 y cierra el modal.
- [ ] Navegar fuera del Reproductor detiene el intervalo (la puntuación no sigue subiendo al volver con el botón atrás mientras estaba oculto).
- [ ] En `/acceso`, la pestaña CREAR CUENTA muestra el campo de correo y INICIAR SESIÓN lo oculta.
- [ ] Iniciar sesión con usuario "kai" lleva a `/` y el nav muestra "KAI ▾" sin recargar; recargar la página lo mantiene.
- [ ] Pulsar "KAI ▾" cierra sesión y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon` muestra una pestaña por juego, el podio con los 3 primeros y 12 filas; cambiar de pestaña cambia los datos.
- [ ] Con sesión iniciada, `/salon` muestra la fila "▸ TU MEJOR MARCA EN <JUEGO>"; sin sesión no aparece.
- [ ] El enlace activo del nav es "Biblioteca" en `/`, `/juegos/*` y "Salón de la Fama" en `/salon`.
- [ ] A 375 px de ancho se ve el botón hamburguesa; abre el panel móvil y elegir una opción navega y lo cierra.
- [ ] `app/page.tsx` ya no contiene referencias a Next.js, Vercel ni `create-next-app`.

---

## Decisiones

- **Sí:** rutas reales del App Router en español (`/juegos/[id]`, `/juegos/[id]/jugar`, `/acceso`, `/salon`). URLs compartibles y encajan con `cacheComponents` y `partialPrefetching`.
- **No:** SPA con router por hash como la plantilla. Port más literal, pero pierde prerender y enlaces reales.
- **No:** rutas en inglés. La interfaz entera está en español.
- **Sí:** datos ficticios en `app/data/games.ts`, en un único módulo. Decisión del usuario: es el sitio donde después entrará la base de datos.
- **Sí:** `getGames()` / `getGame()` async aunque hoy lean una constante. El cambio a BD no obligará a tocar las páginas.
- **No:** varios archivos de datos o JSON estático. Sin beneficio con 8 juegos.
- **Sí:** `generateStaticParams` en las rutas `[id]`. Los ids son conocidos y evita errores de datos no cacheados fuera de `<Suspense>` con `cacheComponents`.
- **Sí:** sesión y puntuaciones mock en `localStorage` con las claves de la plantilla (`av_user`, `av_scores`). Permite ver los estados "con sesión" del nav y del Salón.
- **No:** solo visual sin persistencia, ni estado en memoria. Se perderían estados visuales de la plantilla o se perderían al recargar.
- **No:** versionar las claves de `localStorage`. Es un mock que se sustituirá por auth real.
- **Sí:** simulación completa del Reproductor (contador falso, pausa, modal). Muestra todos los estados visuales sin implementar un juego.
- **No:** arena estática sin timers. Ocultaría los estados de pausa y progreso.
- **Sí:** reusar las clases de `app/globals.css`, ya portadas de la plantilla. Tailwind solo sustituye estilos inline. `/frontend-design` se usa para revisar y pulir, no para rediseñar.
- **No:** reescribir todo con Tailwind ni rediseñar la estética.
- **Sí:** `notFound()` con `app/not-found.tsx` temática para ids inexistentes.
- **No:** redirigir en silencio a `/`. Esconde errores de enlace.
- **Sí:** pulsar el nombre de usuario cierra sesión directamente, como en la plantilla.
- **No:** menú desplegable de usuario. Componente nuevo fuera de la plantilla.
- **Sí:** componentes en `app/components/` (sin `page.tsx`, no generan rutas), junto a `app/data/`.
- **Sí:** solo los componentes con estado o eventos son cliente (`nav`, `library`, `game-card`, `game-player`, `auth-form`, `hall-of-fame`). Las páginas son Server Components.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Error de hidratación al leer `localStorage` en el render | `useUser` usa `useSyncExternalStore` con snapshot de servidor `null`; nada de `localStorage` fuera de efectos o del store. |
| `cacheComponents` oculta rutas con `<Activity>` y el intervalo del Reproductor sigue vivo o se duplica | El intervalo se crea en un efecto y se limpia en su *cleanup*; criterio de aceptación específico. |
| `usePathname` en el nav del layout bloquea el prerender | Si `next build` lo marca, envolver `<Nav>` en `<Suspense>` con un fallback del mismo alto. |
| `toLocaleString("es-ES")` distinto entre servidor y cliente | Formatear con una única función `formatScore` en `app/data/games.ts`; si hay desajuste, usar `Intl.NumberFormat("es-ES")` explícito. |
| La fecha "11/05/2026" fija del Salón queda incoherente | Se acepta en el MVP; se sustituye cuando haya puntuaciones reales. |

---

## Qué **no** entra en esta spec

- Ningún juego jugable.
- Autenticación real, OAuth o validación de formularios.
- Backend, base de datos o API.
- Mostrar las puntuaciones guardadas en Detalle o Salón.
- Sistema de créditos.
- Menú desplegable de usuario.
- Rediseño visual.
- Tests automatizados.

Cada uno de estos puntos, si llega, irá en su propia spec.
