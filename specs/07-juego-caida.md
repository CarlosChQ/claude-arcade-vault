# SPEC 07 — CAÍDA: motor real de piezas que caen

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-25
> **Objetivo:** Portar el juego de `references/started-games/03-tetris` como motor real de la entrada existente `caida` (CAÍDA), jugable con teclado en `/games/caida/jugar` dentro del reproductor, con HUD y modal React, estilo neón y ranking en el Salón de la Fama.

---

## Por qué existe esta spec

El juego de referencia es JavaScript plano (`game.js`, `'use strict'`, sin módulos). Pinta un tablero de 300×600 (10×20 bloques de 30 px) en `<canvas id="board">` y la pieza siguiente en otro canvas de 120×120.
Usa globales de módulo (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`) y escucha `keydown` en `document`. El HUD (`SCORE`, `LINES`, `LEVEL`), la lista de controles y el overlay de PAUSA / GAME OVER con el botón "Reiniciar" están en el DOM. También tiene un selector de tema claro/oscuro guardado en `localStorage` (`tetris-theme`).
El bucle `requestAnimationFrame` no limita `dt` y la `P` pausa el juego.

El catálogo ya tiene CAÍDA (`caida`), un juego simulado de piezas que caen. Esta spec le da motor real y conserva su fila, su portada `cover-tetro` y sus textos.

Es el primer juego real sin vidas, así que **generaliza el HUD**: `GameStats` cambia `power` por `extras` y pasa a `lives: number | null`. Asteroides se migra sin cambios visibles.

---

## Alcance

**Dentro:**

- La entrada `caida` (CAÍDA) pasa de simulación a motor real. Se conservan su fila, su título, sus textos, su portada `cover-tetro` y sus marcas (hoy no tiene ninguna).
- Generalizar el HUD: `GameStats` cambia `power` por `extras` y `lives: number | null`. Asteroides se migra sin cambios visibles.
- Motor en TypeScript en `app/lib/games/caida/`, portado de `game.js` con estas reglas:

  | Regla                   | Valor                                                                                 |
  | ----------------------- | ------------------------------------------------------------------------------------- |
  | Tablero                 | 10 columnas × 20 filas, bloques de 30 px (300×600)                                     |
  | Piezas                  | 8: I, O, T, S, Z, J, L y la tuerca N (anillo 3×3 con el centro vacío)                  |
  | Sorteo                  | Aleatorio puro e independiente: `floor(random() * 8) + 1`. Sin bolsa                   |
  | Aparición               | `x = floor(10 / 2) − floor(ancho / 2)`, `y = 0`                                        |
  | Rotación                | Horaria (transponer + invertir filas), con wall kicks en `x` de `[0, −1, 1, −2, 2]`    |
  | Puntos por líneas       | `[0, 100, 300, 500, 800][líneas a la vez] × nivel`                                     |
  | Soft drop (`↓`)         | Baja 1 fila y suma 1 punto. Si no puede bajar, fija la pieza                           |
  | Hard drop (`Espacio`)   | Cae hasta el fondo, suma 2 puntos por celda recorrida y fija la pieza                  |
  | Nivel                   | `floor(líneas / 10) + 1`                                                                |
  | Intervalo de caída      | `max(100, 1000 − (nivel − 1) × 90)` ms. 1000 ms en el nivel 1                          |
  | Fijado                  | En el mismo tick en que la pieza no puede bajar. Sin lock delay                        |
  | Pieza fantasma          | Proyección hasta el fondo, dibujada con `globalAlpha = 0.2`                            |
  | Vidas                   | Sin vidas (`lives: null`)                                                               |
  | Derrota                 | La pieza nueva colisiona al aparecer                                                    |
  | Repetición de teclas    | La del sistema operativo: cada `keydown` (incluidos los repetidos) es una acción. Sin DAS/ARR |
  | `dt` máximo por frame   | 50 ms                                                                                   |

- Registro en `ENGINES` (`app/lib/games/registry.ts`).
- HUD React: puntuación, nivel y el extra "Líneas". Sin corazones de vidas.
- La pieza siguiente se pinta en el canvas, en un panel "SIGUIENTE" a la derecha del tablero.
- Destello breve sobre las filas completadas, solo visual: no pausa el juego ni cambia los tiempos.
- El HUD en el DOM, la lista de controles, el overlay PAUSA / GAME OVER, el botón "Reiniciar", el título "TETRIS" y el selector de tema de la referencia **se eliminan**.
- Guardado y ranking con lo de SPEC 06, sin cambios de código: `submitScore` y la pestaña CAÍDA del Salón.
- Sin assets: el juego se dibuja con rectángulos en `draw(ctx)`.
- Recoloreado neón con la paleta de `app/globals.css`, diseñado con `/frontend-design`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles.
- Sonido y música.
- Ranking real en la ficha `/games/[id]` (sigue con `seededScores`).
- Bolsa de piezas barajada, rotación antihoraria, lock delay, repetición DAS/ARR propia, reserva de pieza (*hold*) y más de una pieza siguiente.
- Cambiar la fila de `caida` en `games` (textos, portada, `best`, `plays`).
- Tests automatizados.

---

## Modelo de datos

### Entrada de catálogo (`public.games`)

Se usa la fila `caida` tal cual. Sin `insert`, sin `update` y sin cambios de esquema, así que `database.types.ts` no se regenera.

| Columna      | Valor actual                                            |
| ------------ | ------------------------------------------------------- |
| `id`         | `caida`                                                 |
| `title`      | `CAÍDA`                                                 |
| `summary`    | `Encaja las piezas antes de que el techo te aplaste.`  |
| `cat`        | `PUZZLE`                                                |
| `cover`      | `cover-tetro`                                           |
| `color`      | `magenta`                                               |
| `sort_order` | `3`                                                     |

### Contrato de HUD (`app/lib/games/engine.ts`)

```ts
import type { AccentColor } from "@/app/data/games";

export type HudExtra = { label: string; value: string; tone?: AccentColor };

export type GameStats = {
  score: number;
  lives: number | null; // null: el juego no tiene vidas y el HUD oculta los corazones
  level: number;
  extras: HudExtra[]; // hud-stat adicionales, en orden
};
```

- `GamePlayer` pinta cada extra como un `hud-stat` (con la clase del `tone`, si lo hay) y oculta "Vidas" cuando `lives` es `null`.
- La simulación decorativa sigue con 3 vidas y `extras: []`.
- Asteroides migra `power` a `extras`: `[{ label: "Power", value: "3x 4.2s", tone: "green" }]` mientras el disparo triple está activo y `[]` si no. Se ve igual que antes.
- `onStats` compara los `extras` por contenido, no por referencia.
- `CLAUDE.md` no menciona `GameStats`, así que no cambia.

### Motor (`app/lib/games/caida/`)

| Fichero        | Contenido                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `constants.ts` | `W = 800`, `H = 600`, `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, `PIECES` (las 8 matrices de `game.js`), `LINE_SCORES`, intervalo inicial, mínimo y paso, kicks, posición del tablero y del panel |
| `entities.ts`  | Funciones puras sobre el tablero y la pieza: `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines` (devuelve las filas borradas), `ghostY`, y `drawBlock(ctx, …)` |
| `palette.ts`   | Color de cada pieza (índices 1–8), rejilla, marco del tablero y del panel, destello                       |
| `input.ts`     | Teclado en `window` con `attach()`/`detach()`. Encola una acción por cada `keydown`, incluidos los repetidos |
| `index.ts`     | `createCaidaEngine: CreateEngine` con el estado, el bucle, el caído automático, el fijado, las líneas y el dibujo |

- Sin globales de módulo mutables: todo el estado (`board`, `current`, `next`, `score`, `lines`, `level`, `dropAccum`, `dropInterval`, destellos) vive en la instancia. Dos montajes seguidos no comparten estado.
- Área lógica de 800×600, origen arriba a la izquierda. Buffer escalado por `devicePixelRatio` (máximo 2) y ajustado por CSS a `.crt-screen`.
- **Encaje:** el tablero ocupa toda la altura y va centrado (x 250–550, y 0–600). A la derecha, un panel "SIGUIENTE" con la pieza siguiente centrada en una caja de 4×4 bloques de 30 px (120×120), como `drawNext()` de la referencia. Los laterales quedan con el fondo. La posición exacta del panel se cierra con `/frontend-design`.
- El caído automático porta `loop()`: `dropAccum += dt` y, cuando `dropAccum ≥ dropInterval`, `dropAccum = 0` y la pieza baja o se fija.
- Fijar = `merge` + `clearLines` + aparición de la siguiente. Si la nueva colisiona al aparecer, la partida termina.
- Estados internos: `"playing" | "gameover"`, más un flag `paused`. El fin emite `onGameOver` una vez y no espera teclas. Tras el fin el canvas queda congelado con el tablero final.
- Las acciones encoladas se procesan al principio de cada frame. Las que llegan con el motor en pausa o terminado se descartan (los listeners no están puestos).
- El destello es una lista de `{ filas, t }` que solo afecta a `draw`. Las filas se borran del tablero en el mismo frame, como en la referencia. La duración y la forma se cierran con `/frontend-design`.
- La puntuación se limita a `MAX_SCORE` (`app/lib/scores.ts`).

### Estadísticas que emite

| Campo    | Valor                                                     |
| -------- | --------------------------------------------------------- |
| `score`  | Puntuación acumulada, limitada a `MAX_SCORE`              |
| `lives`  | `null`                                                    |
| `level`  | `floor(líneas / 10) + 1`                                  |
| `extras` | `[{ label: "Líneas", value: "<líneas>" }]`, siempre visible |

`onStats` se emite al empezar, al reiniciar y cuando cambia la puntuación, las líneas o el nivel (soft drop, hard drop, líneas). Nunca en cada frame.

### Paleta (`app/lib/games/caida/palette.ts`)

Valores literales de los tokens de `app/globals.css`, porque el canvas no lee variables CSS.

| Elemento            | Color de partida          |
| ------------------- | ------------------------- |
| Fondo               | `#000` (el CRT pone el resto) |
| I                   | `--cyan` `#00f5ff`        |
| O                   | `--yellow` `#f5ff00`      |
| T                   | `--magenta` `#ff006e`     |
| S                   | `--green` `#00ff88`       |
| Z                   | `--bronze` `#d97a3a`      |
| J                   | `--ink` `#e6e9ff`         |
| L                   | `--gold` `#ffcf3a`        |
| N (tuerca)          | `--silver` `#c7d0e0`      |
| Rejilla             | `--ink-faint` `#4a4f70`, con alfa bajo |
| Marco del tablero y del panel | `--magenta` `#ff006e` (color de CAÍDA) |
| Texto "SIGUIENTE"   | `--ink-dim` `#8a8fb5`     |
| Destello            | `--ink` `#e6e9ff`         |
| Pieza fantasma      | Color de la pieza con `globalAlpha = 0.2` |

La combinación exacta, el glow de los bloques y el resalte superior (en la referencia, 4 px de blanco al 12 %) se cierran con `/frontend-design`.

### Input

| Tecla              | Acción                         | Quién la gestiona  |
| ------------------ | ------------------------------ | ------------------ |
| `ArrowLeft`        | Mover una columna a la izquierda | Motor (`input.ts`) |
| `ArrowRight`       | Mover una columna a la derecha | Motor              |
| `ArrowUp`, `KeyX`  | Rotar en sentido horario       | Motor              |
| `ArrowDown`        | Soft drop                      | Motor              |
| `Space`            | Hard drop                      | Motor              |
| `KeyP`, `Escape`   | Pausa / reanudar               | `GamePlayer`       |

- Listeners en `window`, con `attach()`/`detach()` según `start`/`pause`/`resume`/`end`/`restart`/`destroy`.
- `preventDefault()` solo para las teclas de juego (flechas y Espacio no hacen scroll). Se ignoran con el foco en `input`, `textarea` o `contenteditable`.
- `blur` de la ventana vacía la cola de acciones.
- El motor no usa `KeyP`: la pausa de la referencia pasa a `GamePlayer`.

### Assets

Sin assets: el juego se dibuja con rectángulos en `draw(ctx)`. No se crea `public/games/caida/`.

---

## Plan de implementación

1. **Catálogo y portada.** Comprobar con `execute_sql` que la fila `caida` existe (`select id, sort_order from games where id = 'caida'`). Sin cambios en `games` ni en `app/globals.css`. Verificación: `/games`, `/games/caida`, `/salon` y la home muestran CAÍDA con `cover-tetro`, y `/games/caida/jugar` abre la simulación.
2. **Generalizar el HUD.** Cambiar `GameStats` en `app/lib/games/engine.ts` (`HudExtra`, `extras`, `lives: number | null`). Adaptar `GamePlayer` (`app/components/game-player.tsx`) para pintar los `extras` y ocultar "Vidas" con `null`, con la simulación en 3 vidas y `extras: []`. Migrar `app/lib/games/asteroids/index.ts` de `power` a `extras`, comparando por contenido. Verificación: `npx tsc --noEmit` pasa y el HUD de Asteroides se ve igual, incluido "POWER 3x 4.2s".
3. **Constantes y entidades.** Crear `constants.ts`, `palette.ts` y `entities.ts` en `app/lib/games/caida/`, portando de `game.js` las piezas, la rotación, los kicks, las colisiones, el fijado, las líneas y el fantasma. Todavía no las usa nadie.
4. **Motor e input.** Crear `input.ts` e `index.ts` con `createCaidaEngine`: estado por instancia, rAF con `dt` ≤ 50 ms, caído automático, controles, puntuación, niveles, pieza siguiente en el panel, destello, `onStats` solo en cambios y `onGameOver` una vez. Sin HUD ni overlay en el canvas.
5. **Registro y reproductor.** Añadir `caida: createCaidaEngine` a `ENGINES`. Verificación: se juega una partida completa en `/games/caida/jugar`, se guarda la puntuación y aparece en `/salon`.
6. **Diseño neón.** Ajustar la paleta, el glow de los bloques, la rejilla, el panel "SIGUIENTE" y el destello con `/frontend-design`, comprobando la legibilidad bajo las scanlines y la viñeta del CRT. Verificación visual en el navegador.

Cada paso deja la app arrancando con `npm run dev` y `.env.local` válido.

---

## Criterios de aceptación

- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] Con `.env.local` válido, `npm run build` termina sin errores y prerenderiza `/games/caida` y `/games/caida/jugar`.
- [ ] `/games` sigue mostrando CAÍDA en la posición 3 con la portada `cover-tetro`.
- [ ] `/games/caida/jugar` muestra el canvas dentro de `.crt-screen`, con el tablero centrado y el panel "SIGUIENTE" a la derecha, y la consola no muestra errores.
- [ ] La partida empieza al entrar en la ruta, sin pulsar ninguna tecla.
- [ ] `←` y `→` mueven la pieza una columna y no atraviesan las paredes ni los bloques fijados. Mantenerlas pulsadas repite el movimiento con la repetición del sistema.
- [ ] `↑` y `X` rotan en sentido horario. Pegada a una pared, la pieza se desplaza hasta 2 columnas para poder rotar.
- [ ] `↓` baja la pieza una fila y suma 1 punto en el HUD.
- [ ] `Espacio` deja caer la pieza hasta la posición del fantasma, suma 2 puntos por fila recorrida y la fija.
- [ ] Ninguna tecla de juego hace scroll.
- [ ] Completar 1, 2, 3 y 4 líneas a la vez suma 100, 300, 500 y 800 multiplicados por el nivel.
- [ ] Al completar líneas se ve un destello sobre ellas y la pieza siguiente cae sin esperar.
- [ ] El HUD no muestra vidas.
- [ ] El extra "Líneas" del HUD muestra el total de líneas completadas desde 0.
- [ ] A las 10 líneas el nivel pasa a 02 y la caída es más rápida (900 ms). A partir del nivel 11 el intervalo se queda en 100 ms.
- [ ] La tuerca (anillo 3×3) aparece entre las piezas, en `--silver`.
- [ ] La pieza fantasma marca dónde caerá la pieza actual.
- [ ] El panel "SIGUIENTE" muestra la pieza que aparece después.
- [ ] El canvas no pinta HUD, "GAME OVER" ni pantallas de pausa o inicio.
- [ ] PAUSA, `P` y `Escape` congelan la partida y muestran "EN PAUSA". Al reanudar la pieza no baja de golpe.
- [ ] Con la partida en pausa, las flechas y Espacio no mueven la pieza.
- [ ] Cambiar de pestaña y volver deja la partida en pausa.
- [ ] Navegar a otra ruta y volver con "atrás" deja la partida en pausa, sin dos bucles rAF activos (la pieza cae a la velocidad normal).
- [ ] Escribir en el input de iniciales del modal no mueve ni suelta piezas.
- [ ] Cuando una pieza nueva no cabe al aparecer, se abre "FIN DEL JUEGO" con la puntuación final.
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar.
- [ ] Guardar una partida de `caida` con el nombre `neo` crea en `scores` una fila con `game_id = 'caida'`, `name = 'NEO'` y la puntuación del modal.
- [ ] Tras guardar, navegar a `/salon` muestra la marca en la pestaña CAÍDA sin recargar.
- [ ] "JUGAR DE NUEVO" empieza una partida desde cero: tablero vacío, puntuación 0, líneas 0 y nivel 01.
- [ ] El HUD de Asteroides se ve igual que antes: 3 corazones y "POWER" solo con el disparo triple activo.
- [ ] Asteroides sigue funcionando, y los 7 juegos simulados que quedan siguen con la simulación.
- [ ] Las piezas, la rejilla y los marcos usan los colores de `palette.ts`.

---

## Decisiones

- **Sí:** dar motor real a la entrada `caida`. Es decisión del usuario.
- **No:** crear una fila nueva. Habría dos juegos de piezas casi iguales en el catálogo.
- **Sí:** mantener el título CAÍDA, los textos y la portada `cover-tetro`.
- **No:** `update` en `games` ni portada nueva.
- **Sí:** motor en TypeScript puro en `app/lib/games/caida/` con el contrato `GameEngine`, y HUD y modal React.
- **No:** cargar `game.js` con `<Script>` ni mantener el HUD, el overlay o el selector de tema de la referencia.
- **Sí:** leaderboard de SPEC 06 sin cambios de código.
- **Sí:** generalizar el HUD (`extras`, `lives: number | null`) en esta spec, porque es el primer juego sin vidas.
- **No:** añadir un campo `lines` a `GameStats`. Cada juego nuevo obligaría a tocar el contrato.
- **Sí:** las 8 piezas de la referencia, incluida la tuerca.
- **No:** quedarse con las 7 clásicas.
- **Sí:** sorteo aleatorio puro, como `game.js`.
- **No:** bolsa barajada. Es una mecánica nueva.
- **Sí:** la puntuación de la referencia tal cual, incluidos los puntos de soft drop y hard drop.
- **No:** puntuar solo las líneas.
- **Sí:** repetición de teclas del sistema operativo, una acción por `keydown`.
- **No:** DAS/ARR propios.
- **Sí:** los controles de la referencia sin cambios, menos la `P`, que pasa a `GamePlayer`.
- **No:** rotación antihoraria.
- **Sí:** fijar la pieza en el mismo tick, sin lock delay.
- **Sí:** HUD con puntuación, nivel y "Líneas". Sin vidas.
- **No:** un extra con las líneas que faltan para subir de nivel.
- **Sí:** tablero centrado a toda altura y panel "SIGUIENTE" a la derecha, pintado en el canvas.
- **No:** quitar la pieza siguiente ni pintar la lista de controles en el canvas.
- **Sí:** colores de las piezas sacados solo de los tokens de `app/globals.css`.
- **No:** tonos nuevos que solo existan en el canvas.
- **Sí:** destello visual al completar líneas, sin pausar el juego ni cambiar los tiempos.
- **No:** animación de borrado que detenga la caída.
- **Sí:** sin sonido, como SPEC 05.
- **Sí:** sin assets, todo con rectángulos.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| El catálogo está cacheado (`cacheLife("hours")`) | Esta spec no toca `games`, así que no aplica. |
| `<Activity>` oculta la ruta: bucles rAF duplicados o listeners huérfanos | `GameCanvas` crea el motor una vez y lo pausa en el *cleanup*. Criterio de aceptación dedicado. |
| Re-renders a 60 fps por las estadísticas | `onStats` solo emite cuando cambian la puntuación, las líneas o el nivel. Los `extras` se comparan por contenido. |
| Una puntuación fuera de rango rompe el guardado | El motor la limita a `MAX_SCORE`. |
| Romper el HUD de Asteroides al generalizar `GameStats` | Paso 2 aislado, con su verificación y un criterio de aceptación dedicado. |
| Mantener pulsado `Espacio` encadena hard drops con la repetición del teclado | Es el comportamiento de la referencia y se acepta. Si molesta, se ignoran los `keydown` con `repeat` solo para `Space` en otra spec. |
| Con `dt` limitado a 50 ms, una pestaña lenta hace caer la pieza más despacio | Aceptado: es el mismo límite que Asteroides y evita saltos. El intervalo mínimo (100 ms) sigue siendo mayor que 50 ms. |
| El tablero de 300 px de ancho deja mucho vacío en 800×600 | El panel "SIGUIENTE" y el diseño de los laterales se cierran con `/frontend-design`. |
| Los bloques de 30 px con resalte fino se pierden bajo las scanlines | Glow y resalte se ajustan en el paso 6. |
| La ficha anuncia "TECLADO / TÁCTIL" pero no hay táctil | Aceptado, como en SPEC 05. Se corrige con la spec de controles táctiles. |

---

## Qué **no** entra en esta spec

- Controles táctiles.
- Sonido y música.
- Ranking real en la ficha y en la home.
- Bolsa de piezas, rotación antihoraria, lock delay, DAS/ARR, *hold* y más de una pieza siguiente.
- Cambios en la fila `caida` del catálogo.
- Tests automatizados.

Cada uno de estos puntos, si llega, irá en su propia spec.
