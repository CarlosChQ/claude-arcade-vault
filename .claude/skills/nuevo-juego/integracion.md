# Puntos de integración de un juego real

Checklist que toda spec de juego tiene que cubrir. Sale de SPEC 05 (Asteroides) y SPEC 06 (catálogo y leaderboard en Supabase). Cada punto indica el fichero real que afecta. Si un punto no aplica, la spec lo dice de forma explícita.

---

## 1. Catálogo (`public.games` en Supabase)

**Fila nueva:**

- Un paso del plan hace el `insert` con la herramienta MCP `execute_sql`:

  ```sql
  insert into games (id, title, summary, description, cat, cover, color, best, plays, sort_order)
  values ('<id>', '<TÍTULO>', '<resumen de tarjeta>', '<descripción larga>', '<CAT>', 'cover-<id>', '<color>', <best>, '<plays>', <n>);
  ```

- `cat` está restringido por `CHECK` a `ARCADE`, `PUZZLE`, `SHOOTER` o `VERSUS`, y `color` a `cyan`, `magenta`, `yellow` o `green`.
- `best` (entero ≥ 0) y `plays` (texto ya formateado, p. ej. `"1.2K"`) son estáticos, no se calculan desde `scores`. La spec da valores verosímiles.
- `sort_order` es `unique`. Al final del catálogo: `max(sort_order) + 1`. Para ponerlo primero hay que desplazar el resto antes del `insert`, en dos pasos para no chocar con el `unique`:
  `update games set sort_order = sort_order + 100;` → `update games set sort_order = sort_order - 99;` → `insert … sort_order = 1`.
- Verificación del paso: `select id, sort_order from games order by sort_order` lo muestra en su sitio.

**Reutilizar una entrada simulada:**

- No se toca la fila, salvo que la spec cambie textos o portada (`update` con `execute_sql`).
- El `id` y las marcas que ya tenga en `scores` se conservan.

**En los dos casos:**

- No hay cambio de esquema, así que `app/lib/supabase/database.types.ts` no se regenera.
- `getGames()` (`app/data/catalog.ts`) usa `cacheLife("hours")`. Después de tocar `games` hay que reiniciar `next dev` para ver el cambio. Va en Riesgos.

## 2. Portada

- Clase `.cover-<id>` en `app/globals.css`, junto a las demás portadas (`.cover-asteroides`, `.cover-bricks`…), diseñada con `/frontend-design`.
- Solo para una fila nueva, o si se rediseña la de una entrada reutilizada.

## 3. Motor (`app/lib/games/<id>/`)

Ficheros (los mismos que en `app/lib/games/asteroids/`):

| Fichero        | Contenido                                                              |
| -------------- | ---------------------------------------------------------------------- |
| `constants.ts` | Dimensiones lógicas, velocidades, puntos, tiempos                      |
| `entities.ts`  | Clases o funciones de entidades con `update(dt)` y `draw(ctx)`         |
| `palette.ts`   | Colores neón literales de los tokens de `app/globals.css`              |
| `input.ts`     | Teclado en `window` con `attach()`/`detach()`                          |
| `index.ts`     | `create<Nombre>Engine: CreateEngine` con estado, bucle y colisiones    |

Si el juego tiene niveles en datos (como `levels.js`), van en `levels.ts`.

Requisitos (contrato de `app/lib/games/engine.ts`):

- Sin globales mutables de módulo: todo el estado vive en la instancia. Dos montajes seguidos no comparten estado.
- Área lógica de 800×600, origen arriba a la izquierda. Buffer escalado por `devicePixelRatio` (máximo 2). El CSS `.game-canvas` lo ajusta a `.crt-screen` (4:3).
- Bucle `requestAnimationFrame` con `dt` de 50 ms como máximo. `resume()` usa `dt = 0` en el primer frame.
- `pause()` cancela el rAF y quita los listeners de teclado. `destroy()` lo quita todo.
- `onStats` solo cuando cambia algún campo, nunca en cada frame. Los valores que cambian continuamente (cuentas atrás) se redondean.
- `onGameOver(finalScore)` una sola vez por partida. Tras el fin no se espera ninguna tecla: el modal de React se encarga.
- El canvas **no** pinta HUD (puntuación, vidas, nivel) ni "GAME OVER" ni pantallas de pausa o de inicio.
- La partida empieza al llamar a `start()`, sin pantalla de "pulsa para empezar".
- `restart()` deja una partida nueva desde cero.
- La puntuación se limita a `MAX_SCORE` (`app/lib/scores.ts`, 9.999.999). Si no, el `CHECK` de `scores` rechaza el guardado.

Input (patrón de `app/lib/games/asteroids/input.ts`):

- Listeners en `window`. Se registran en `start()`/`resume()`/`restart()` y se quitan en `pause()`/`end()`/`destroy()`.
- `preventDefault()` solo para las teclas de juego (flechas y Espacio no hacen scroll).
- Se ignoran las teclas cuando el foco está en `input`, `textarea` o `contenteditable` (las iniciales del modal).
- `blur` de la ventana suelta todas las teclas.
- `P` y `Escape` son de `GamePlayer` (pausa). El motor no las usa.

## 4. Registro

Una línea en `ENGINES` (`app/lib/games/registry.ts`):

```ts
<id>: create<Nombre>Engine,
```

Con eso `GamePlayer` usa el motor en lugar de la simulación.

## 5. Reproductor y HUD

`GameCanvas` (`app/components/game-canvas.tsx`) y `GamePlayer` (`app/components/game-player.tsx`) ya gestionan la pausa (botón, `P`/`Escape`, `visibilitychange`), la ruta oculta con `<Activity>`, FIN, fin por derrota, "JUGAR DE NUEVO" y el modal "FIN DEL JUEGO". **No se tocan**, salvo para generalizar el HUD.

**Generalizar el HUD** (solo si `engine.ts` todavía tiene `power`):

```ts
export type HudExtra = { label: string; value: string; tone?: AccentColor };

export type GameStats = {
  score: number;
  lives: number | null; // null: el juego no tiene vidas y el HUD oculta los corazones
  level: number;
  extras: HudExtra[]; // hud-stat adicionales, en orden
};
```

- `AccentColor` sale de `app/data/games.ts`.
- `GamePlayer` pinta cada extra como un `hud-stat` (con la clase del `tone`, si lo hay) y oculta "Vidas" cuando `lives` es `null`. La simulación sigue con 3 vidas y `extras: []`.
- Asteroides migra `power` a `extras`: `[{ label: "Power", value: "3x 4.2s", tone: "green" }]` mientras el disparo triple está activo, `[]` si no. Se ve igual que antes.
- `onStats` compara los `extras` por contenido, no por referencia.
- Se actualiza la descripción de `GameStats` en `CLAUDE.md` si la menciona.
- Criterio de aceptación: el HUD de Asteroides se ve igual que antes.

Lo que no es texto (pieza siguiente, mapa, previsualizaciones) se pinta en el canvas, en una zona lateral del área de 800×600, y no va en `extras`.

## 6. Leaderboard

Ya es genérico por `game_id`, así que **no se cambia código**:

- `submitScore` (`app/games/[id]/jugar/actions.ts`) valida que `gameId` esté en `getGames()`, inserta en `scores` y llama a `updateTag("scores")`.
- La vista `leaderboard` saca la mejor marca de cada nombre por juego.
- `HallOfFame` (`/salon`) saca las pestañas de `getGames()`, así que el juego nuevo aparece solo, con su estado vacío si no tiene marcas.

La spec solo añade criterios de aceptación:

- Guardar una partida de `<id>` con el nombre `neo` crea en `scores` una fila con `game_id = '<id>'`, `name = 'NEO'` y la puntuación del modal.
- Tras guardar, navegar a `/salon` muestra la marca en la pestaña del juego sin recargar.
- Si se reutiliza una entrada, sus marcas anteriores siguen en el Salón.

## 7. Assets

- Se copian de la referencia a `public/games/<id>/` (sin `.DS_Store` ni `__MACOSX`) y se cargan desde el motor con `new Image()` o `new Audio()`, con rutas absolutas (`/games/<id>/…`).
- El motor no avanza la simulación hasta que los assets estén listos. Mientras tanto, o pinta un estado de carga en el canvas o la spec dice cómo se comporta.
- Sonido: por defecto fuera de alcance, como en SPEC 05. Si entra, volumen bajo, silencio al pausar y ningún sonido antes de la primera interacción (política de autoplay).
- Sin assets: se dice de forma explícita ("el juego se dibuja con vectores en `draw(ctx)`").

## 8. Diseño neón

- Paleta en `palette.ts` con los valores literales de `app/globals.css` (`--cyan` `#00f5ff`, `--magenta` `#ff006e`, `--yellow` `#f5ff00`, `--green` `#00ff88`, `--ink` `#e6e9ff`), porque el canvas no lee variables CSS.
- Glow (`shadowBlur` o doble trazo) y grosor de línea ajustados para que se lea bajo las scanlines y la viñeta del CRT.
- Se diseña con `/frontend-design`, como exige `CLAUDE.md`.

## 9. Build y rutas

- `generateStaticParams` de `app/games/[id]/page.tsx` y `app/games/[id]/jugar/page.tsx` lee `getGames()`, así que el juego se prerenderiza solo.
- Criterio: `npm run build` (con `.env.local` válido) prerenderiza `/games/<id>` y `/games/<id>/jugar`.
