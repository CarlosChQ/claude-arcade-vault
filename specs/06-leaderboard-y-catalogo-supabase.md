# SPEC 06 — Leaderboard y catálogo de juegos en Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 05
> **Fecha:** 2026-11-22
> **Objetivo:** Mover el catálogo de juegos a una tabla `games` de Supabase y guardar las puntuaciones en una tabla `scores`, para que el Salón de la Fama (`/salon`) muestre el ranking real de cada juego.

---

## Por qué existe esta spec

El catálogo es hoy la constante `GAMES` de `app/data/games.ts`, y las puntuaciones solo se guardan en `localStorage` (`av_scores`) sin que nadie las lea.
El Salón de la Fama muestra un ranking inventado (`seededScores`) y una fila "TU MEJOR MARCA" calculada a partir de él.
La SPEC 04 dejó listos los clientes de Supabase, pero el esquema `public` sigue sin tablas.
Esta spec crea las dos primeras tablas y conecta el ciclo completo: jugar, guardar y verse en el Salón.
Todavía no hay auth real, así que la escritura es anónima con nombre libre.

---

## Alcance

**Dentro:**

- Tabla `games` en Supabase con los 9 juegos actuales de `GAMES`, incluidos `best` y `plays` como columnas estáticas.
- Tabla `scores` vacía, con `CHECK` de nombre y puntuación, y RLS que solo permite `SELECT` e `INSERT` a `anon` y `authenticated`.
- Vista `leaderboard`: la mejor marca de cada nombre por juego, con su puesto.
- `getGames()` y `getGame()` leen de Supabase con `"use cache"`. La constante `GAMES` desaparece del código.
- Cliente sin cookies `app/lib/supabase/public.ts`, para lecturas públicas dentro de `"use cache"`.
- `app/lib/scores.ts`: normalización y validación de nombre y puntuación, y `getLeaderboards()` con `"use cache"` y `cacheTag("scores")`.
- Server Action `submitScore` en `app/games/[id]/jugar/actions.ts`, que valida, inserta y llama a `updateTag("scores")`.
- Modal "FIN DEL JUEGO": estados "GUARDANDO…", error "NO SE PUDO GUARDAR" con reintento, y el aviso de guardado que ya existe.
- `saveScore`, `ScoreEntry` y la clave `av_scores` se eliminan de `use-user.ts`.
- `HallOfFame` en `/salon` usa el top 12 real por juego, con podio y tabla.
- Estado vacío para juegos sin marcas, diseñado con `/frontend-design`.
- Fila "TU MEJOR MARCA": mejor registro real del nombre de `av_user` y su puesto. Se oculta si no existe.
- `database.types.ts` regenerado y `CLAUDE.md` actualizado (la build ahora exige las variables de Supabase).

**Fuera de alcance (para specs futuras):**

- Auth real y vincular puntuaciones a usuarios. `av_user` sigue siendo mock.
- El panel "MEJORES PUNTUACIONES" de `/games/[id]`, que sigue con `seededScores`.
- "Actividad en vivo" de la home (`RECENT_SCORES` y `TOP_PLAYERS` de `app/data/home.ts`).
- Calcular `best` y `plays` a partir de `scores`.
- Antitrampas más allá de los `CHECK` (límite de frecuencia, firma de partidas, validación en el servidor del motor).
- Migrar las puntuaciones antiguas de `av_scores` a Supabase.
- Paginación o más de 12 filas por juego en el Salón.
- Editar el catálogo desde la app. Se edita en el dashboard.
- Tiempo real (suscripciones de Supabase Realtime).
- Tests automatizados.

---

## Modelo de datos

### Tabla `public.games`

| Columna       | Tipo      | Restricciones                                                  | Origen en `Game` |
| ------------- | --------- | -------------------------------------------------------------- | ---------------- |
| `id`          | `text`    | PK. Slug de la URL (`asteroides`, `bloque-buster`, …)          | `id`             |
| `title`       | `text`    | `not null`                                                     | `title`          |
| `summary`     | `text`    | `not null`                                                     | `short`          |
| `description` | `text`    | `not null`                                                     | `long`           |
| `cat`         | `text`    | `not null`, `check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS'))` | `cat`       |
| `cover`       | `text`    | `not null`. Clase CSS (`cover-asteroides`, …)                  | `cover`          |
| `color`       | `text`    | `not null`, `check (color in ('cyan','magenta','yellow','green'))` | `color`      |
| `best`        | `integer` | `not null`, `check (best >= 0)`                                | `best`           |
| `plays`       | `text`    | `not null`. Texto ya formateado (`"12.4K"`)                    | `plays`          |
| `sort_order`  | `integer` | `not null`, `unique`                                           | posición en `GAMES` |

- Se siembra con los 9 juegos de `GAMES` tal cual están hoy, en el mismo orden (`asteroides` = 1).
- RLS activado. Política `SELECT` para `anon` y `authenticated` con `using (true)`. Sin políticas de escritura.

### Tabla `public.scores`

| Columna      | Tipo          | Restricciones                                                         |
| ------------ | ------------- | --------------------------------------------------------------------- |
| `id`         | `bigint`      | PK, `generated always as identity`                                    |
| `game_id`    | `text`        | `not null`, FK → `games(id)` `on delete cascade`                      |
| `name`       | `text`        | `not null`, `check (name ~ '^[A-Z0-9_]{1,12}$')`                      |
| `score`      | `integer`     | `not null`, `check (score between 0 and 9999999)`                     |
| `created_at` | `timestamptz` | `not null`, `default now()`                                           |

- Índice `scores_game_score_idx` en `(game_id, score desc)`.
- RLS activado. Política `SELECT` con `using (true)` e `INSERT` con `with check (true)` para `anon` y `authenticated`. Sin `UPDATE` ni `DELETE`. Los `CHECK` son la validación que no se puede saltar.
- Empieza vacía.

### Vista `public.leaderboard`

Creada con `security_invoker = true`, para que se apliquen las políticas de `scores`.

| Columna      | Significado                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `game_id`    | Juego                                                                        |
| `name`       | Nombre                                                                       |
| `score`      | Mejor puntuación de ese nombre en ese juego                                   |
| `created_at` | Cuándo la consiguió (la primera vez, si la repitió)                           |
| `rank`       | `row_number()` por juego, ordenado por `score desc, created_at asc`           |

- Una fila por `(game_id, name)`. En un empate gana quien llegó antes.

### Normalización y validación (`app/lib/scores.ts`)

```ts
export const NAME_RE = /^[A-Z0-9_]{1,12}$/;
export const MAX_SCORE = 9_999_999;

// trim + toUpperCase + recorte a 12 caracteres. Se valida después con NAME_RE.
export function normalizeName(raw: string): string;

export type LeaderboardRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/YYYY"

// Top 12 de cada juego, indexado por game_id. Los juegos sin marcas llevan [].
export async function getLeaderboards(): Promise<Record<string, LeaderboardRow[]>>; // "use cache" + cacheTag("scores")
```

- `"INVITADO"` es un nombre válido. Todas las partidas sin nombre comparten esa fila del ranking.
- `LeaderboardRow` sustituye a `ScoreRow` en el Salón. `ScoreRow` y `seededScores` se quedan en `app/data/games.ts` porque los usa la ficha.
- La fecha se formatea en `es-ES` con zona `Europe/Madrid`.

### Server Action (`app/games/[id]/jugar/actions.ts`)

```ts
export type SubmitScoreResult = { ok: true } | { ok: false; error: "invalid" | "server" };

export async function submitScore(input: { gameId: string; name: string; score: number }): Promise<SubmitScoreResult>;
```

- Normaliza `name` con `normalizeName`, y comprueba `NAME_RE`, que `score` sea entero entre 0 y `MAX_SCORE` y que `gameId` sea un `id` de `getGames()`.
- Inserta con el `createClient()` de `app/lib/supabase/server.ts`.
- Si va bien, llama a `updateTag("scores")`.
- En un error, `console.error("[scores]", motivo)` en el servidor. La respuesta nunca incluye el mensaje de Supabase.

### Cliente público (`app/lib/supabase/public.ts`)

```ts
// Sin cookies ni sesión: apto para "use cache". Lanza el mismo error que server.ts si faltan variables.
export function createPublicClient(): SupabaseClient<Database>;
```

Usa `createClient` de `@supabase/supabase-js` con `auth: { persistSession: false, autoRefreshToken: false }`.

### Catálogo (`app/data/games.ts`)

- El tipo `Game` no cambia. Una función interna mapea `summary → short` y `description → long`.
- `getGames()`: `"use cache"`, `cacheTag("games")` y `cacheLife("hours")`. Ordena por `sort_order`. Si Supabase devuelve un error, lanza `Error("[games] No se pudo leer el catálogo")`.
- `getGame(id)`: busca en el resultado de `getGames()`, así que no hace una consulta aparte.

### Fila "TU MEJOR MARCA"

- `HallOfFame` es Client Component y el usuario sale de `localStorage`, así que esta lectura va en el navegador.
- Con el cliente de `app/lib/supabase/client.ts`, consulta `leaderboard` con `game_id = tab` y `name = normalizeName(user.name)`.
- Si no hay fila, el nombre no es válido o la consulta falla, la fila no se muestra.

### Modal "FIN DEL JUEGO" (`app/components/game-player.tsx`)

| Estado         | Botón                                 | Texto                              |
| -------------- | ------------------------------------- | ---------------------------------- |
| Sin guardar    | "GUARDAR PUNTUACIÓN" activo           | —                                  |
| Guardando      | "GUARDANDO…" deshabilitado            | —                                  |
| Error          | "GUARDAR PUNTUACIÓN" activo de nuevo  | "NO SE PUDO GUARDAR" en magenta    |
| Guardado       | Se oculta                             | "▸ PUNTUACIÓN GUARDADA_" (ya existe) |

- La acción se llama con `useTransition`. El estado de `saved` del reducer pasa a ser `save: "idle" | "saving" | "error" | "saved"`.
- "JUGAR DE NUEVO" vuelve a `"idle"`.
- La puntuación de la simulación de los demás juegos también se guarda en Supabase, igual que antes se guardaba en `av_scores`.

---

## Plan de implementación

1. **Esquema.** Con la herramienta MCP `apply_migration`, crear `games`, `scores`, el índice, la vista `leaderboard`, RLS y políticas. Comprobar con `get_advisors` (tipo `security`) que no hay avisos nuevos. Verificación: `list_tables` muestra `games` y `scores` con RLS activado.
2. **Semilla del catálogo.** Con `execute_sql`, insertar los 9 juegos de `GAMES` con el mismo orden y los mismos valores. Verificación: `select count(*) from games` devuelve 9.
3. **Tipos.** Regenerar `app/lib/supabase/database.types.ts` con `generate_typescript_types`. Verificación: `npx tsc --noEmit` pasa.
4. **Cliente público.** Crear `app/lib/supabase/public.ts`. Antes, leer en `node_modules/next/dist/docs/` las guías de `"use cache"`, `cacheTag`, `cacheLife` y `updateTag`.
5. **Catálogo desde la BD.** Reescribir `getGames()` y `getGame()` con `createPublicClient()` y borrar la constante `GAMES`. Verificación: `/`, `/games`, `/games/asteroides`, `/games/asteroides/jugar` y `/salon` se ven igual que antes.
6. **Lecturas de puntuaciones.** Crear `app/lib/scores.ts` con `normalizeName`, `NAME_RE`, `MAX_SCORE`, `LeaderboardRow` y `getLeaderboards()`. Todavía no lo usa nadie.
7. **Guardado.** Crear `app/games/[id]/jugar/actions.ts` con `submitScore`. En `GamePlayer`, sustituir `saveScore` por la acción con los estados del modal. Borrar `saveScore`, `ScoreEntry` y `SCORES_KEY` de `use-user.ts`. Verificación: guardar una partida añade una fila en `scores`.
8. **Salón real.** `app/salon/page.tsx` pasa el resultado de `getLeaderboards()` a `HallOfFame`, que deja de usar `seededScores`. Añadir la fila "TU MEJOR MARCA" con la consulta del navegador. Verificación: la marca guardada en el paso 7 aparece en su pestaña.
9. **Estado vacío.** Diseñar con `/frontend-design` el podio y la tabla de un juego sin marcas ("SIN MARCAS TODAVÍA", con un enlace a jugar) y los huecos del podio cuando hay menos de 3 nombres. Verificación visual en el navegador.
10. **Documentación.** Actualizar `CLAUDE.md`: el catálogo y las puntuaciones están en Supabase, la build exige `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y existen las tablas `games` y `scores` y la vista `leaderboard`.

Cada paso deja la app arrancando con `npm run dev` y `.env.local` válido.

---

## Criterios de aceptación

- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] Con `.env.local` válido, `npm run build` termina sin errores y prerenderiza los 9 `/games/[id]`.
- [ ] `app/data/games.ts` ya no contiene la constante `GAMES` ni textos de juegos.
- [ ] `database.types.ts` incluye `games`, `scores` y `leaderboard`, y no está editado a mano.
- [ ] `get_advisors` (security) no muestra avisos sobre `games`, `scores` ni `leaderboard`.
- [ ] `/games` muestra los 9 juegos en el mismo orden que antes, con ASTEROIDES primero.
- [ ] Un `insert` en `scores` con la publishable key y `name = 'abc!'` o `score = -1` falla por `CHECK`.
- [ ] Un `update` o `delete` en `scores` con la publishable key no modifica ninguna fila.
- [ ] Guardar una partida de `asteroides` con el nombre `neo` crea en `scores` una fila con `name = 'NEO'` y la puntuación del modal.
- [ ] Durante el guardado el botón muestra "GUARDANDO…" y está deshabilitado.
- [ ] Si Supabase falla (por ejemplo, con la red cortada en DevTools), el modal muestra "NO SE PUDO GUARDAR" y el botón permite reintentar.
- [ ] Tras guardar, navegar a `/salon` muestra la nueva marca en la pestaña del juego sin recargar la página.
- [ ] Si un mismo nombre guarda 3 partidas en un juego, aparece una sola vez en el Salón, con su mejor puntuación.
- [ ] El Salón muestra como máximo 12 filas por juego, ordenadas de mayor a menor.
- [ ] Un juego sin marcas muestra el estado vacío y ningún nombre de `PLAYERS`.
- [ ] Con un juego de 1 o 2 marcas, los huecos vacíos del podio no rompen el layout.
- [ ] Con una sesión de `av_user` que tiene una marca, la fila "TU MEJOR MARCA" muestra su puntuación, su puesto real y su fecha.
- [ ] Sin sesión, o con una sesión sin marcas en esa pestaña, la fila "TU MEJOR MARCA" no aparece.
- [ ] `localStorage` no recibe escrituras en `av_scores` al guardar.
- [ ] El panel "MEJORES PUNTUACIONES" de `/games/[id]` y la "Actividad en vivo" de la home se ven igual que antes.
- [ ] `CLAUDE.md` documenta las tablas, la vista y que la build exige las variables de Supabase.

---

## Decisiones

- **Sí:** catálogo en una tabla `games` de Supabase con lectura en `getGames()` y `getGame()`. Es decisión del usuario, y `games.ts` ya anunciaba ese cambio.
- **No:** una tabla `games` solo para la FK con `GAMES` en el código. Serían dos fuentes que desincronizar.
- **Sí:** portadas (`cover-*`) y motores (`ENGINES`) siguen en el código. La BD solo guarda el nombre de la clase y el `id`.
- **Sí:** `best` y `plays` como columnas estáticas copiadas de `GAMES`.
- **No:** calcularlos desde `scores` en esta spec. Con la tabla vacía, la ficha y la home mostrarían ceros.
- **Sí:** la build exige Supabase y `GAMES` desaparece. Una sola fuente de verdad.
- **No:** respaldo a una copia local. Rompe la regla de las SPEC 03 y 04 ("la build funciona sin variables"), y esa regla se revoca aquí de forma explícita.
- **Sí:** escritura anónima con nombre libre y RLS de solo `SELECT` e `INSERT`. No hay auth real todavía.
- **No:** función RPC `security definer` ni esperar a la spec de auth.
- **Sí:** `CHECK` en la tabla además de la validación en la Server Action. La publishable key permite insertar sin pasar por la acción, así que la tabla es la única barrera segura.
- **Sí:** nombre de 1–12 caracteres `[A-Z0-9_]`, normalizado a mayúsculas. Puntuación entera de 0 a 9.999.999.
- **No:** iniciales de 3 letras estilo arcade. Obligaría a cambiar el modal y a dejar de aceptar "INVITADO".
- **Sí:** ranking con la mejor marca por nombre, mediante la vista `leaderboard`.
- **No:** listar todas las partidas en bruto. Un jugador podría llenar el top.
- **Sí:** guardado con una Server Action, que permite validar en el servidor e invalidar la caché con `updateTag`. Es el patrón de `/acerca`.
- **No:** `insert` directo desde el navegador.
- **Sí:** Salón cacheado con `"use cache"` y `cacheTag("scores")`, invalidado al guardar.
- **No:** consulta dinámica en cada visita.
- **Sí:** cliente sin cookies (`public.ts`) para las lecturas cacheadas. `cookies()` no se puede usar dentro de `"use cache"`, y estos datos no dependen del usuario.
- **Sí:** `cacheLife("hours")` para el catálogo. Los cambios hechos en el dashboard aparecen como mucho en unas horas sin desplegar.
- **Sí:** `scores` empieza vacía y el Salón tiene un estado vacío.
- **No:** sembrar puntuaciones ficticias que se mezclen con las reales.
- **Sí:** solo Supabase. `av_scores` deja de escribirse, y la fila "TU MEJOR MARCA" sale del nombre de `av_user` con su puesto real.
- **No:** escribir también en `av_scores` ni eliminar la fila.
- **Sí:** el fallo de guardado muestra un mensaje y permite reintentar.
- **No:** fallar en silencio.
- **Sí:** solo `/salon` usa datos reales. Es decisión del usuario. La ficha y la home quedan para otra spec.
- **Sí:** columnas `summary` y `description` en lugar de `short` y `long`, con el mapeo en `getGames()`. Así el tipo `Game` y sus consumidores no cambian.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Cualquiera con la publishable key puede insertar puntuaciones falsas | Aceptado hasta la spec de auth. Los `CHECK` limitan el formato y el máximo. Sin `UPDATE` ni `DELETE`, nadie borra marcas ajenas. |
| Todas las partidas sin nombre se agrupan en una sola fila "INVITADO" | Aceptado. Solo cuenta su mejor marca, y no ocupa más de un puesto. |
| Sin variables de Supabase, `npm run build` y CI fallan, cosa que antes no pasaba | Cambio documentado en `CLAUDE.md` y en Decisiones. El error dice qué variable falta. |
| `cookies()` dentro de `"use cache"` rompe la build | Las lecturas cacheadas usan `createPublicClient()`, que no lee cookies. |
| La ficha muestra un ranking inventado y el Salón uno real, y no coinciden | Aceptado. La ficha se conecta en su propia spec. |
| `best` estático ("Mejor global") puede ser menor que una marca real del Salón | Aceptado hasta la spec que calcule `best` desde `scores`. |
| Un cambio de esquema desde el dashboard deja `database.types.ts` desfasado | Regla de `CLAUDE.md`: regenerar con `generate_typescript_types`. El paso 3 lo hace. |
| El nombre de `av_user` no cumple `NAME_RE` (por ejemplo, tiene espacios) | `normalizeName` se aplica antes de consultar. Si sigue sin ser válido, la fila "TU MEJOR MARCA" no se muestra y el guardado devuelve `invalid`. |

---

## Qué **no** entra en esta spec

- Auth real y puntuaciones vinculadas a usuarios.
- Ranking real en la ficha `/games/[id]` y en la home.
- `best` y `plays` calculados.
- Antitrampas avanzadas y límites de frecuencia.
- Migrar `av_scores` antiguos.
- Paginación del Salón y tiempo real.
- Edición del catálogo desde la app.
- Tests automatizados.

Cada uno de estos puntos, si llega, irá en su propia spec.
