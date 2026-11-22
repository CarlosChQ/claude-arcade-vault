# SPEC 05 — Asteroides: primer juego real de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-18
> **Objetivo:** Portar el juego de `references/started-games/02-asteroids` a una entrada nueva `asteroides` del catálogo, jugable con teclado en `/games/asteroides/jugar` dentro del reproductor existente, con HUD y modal React y estilo neón.

---

## Por qué existe esta spec

Hasta ahora el reproductor (`app/components/game-player.tsx`) es una simulación decorativa: la puntuación sube sola y no hay juego.
El juego de referencia es un canvas 800×600 en JavaScript plano, con globales, `window` como fuente de input, HUD pintado en el canvas y un bucle `requestAnimationFrame` sin fin.
Esta spec lo convierte en un motor TypeScript que se monta y desmonta limpiamente dentro de una ruta de Next.js con `cacheComponents` (rutas ocultas con `<Activity>`), y define el contrato común que usarán los siguientes juegos reales.
Los otros 8 juegos del catálogo siguen con la simulación.

---

## Alcance

**Dentro:**

- Entrada nueva `asteroides` en `GAMES` (`app/data/games.ts`), la **primera** de la lista, con portada CSS nueva `cover-asteroides`.
- Contrato común de motor de juego en `app/lib/games/engine.ts` y registro de motores en `app/lib/games/registry.ts`.
- Motor de asteroides en TypeScript en `app/lib/games/asteroids/`, portado de `game.js` con las mismas reglas y constantes:

  | Regla                      | Valor                                                   |
  | -------------------------- | ------------------------------------------------------- |
  | Puntos por tamaño          | Grande 20 · Mediano 50 · Pequeño 100                    |
  | Vidas                      | 3, con 3 s de invencibilidad con parpadeo al reaparecer |
  | Asteroides por nivel       | 4 en el nivel 1, `3 + nivel` en los siguientes          |
  | Power-up disparo triple    | 15 % de probabilidad, garantizado a las 5 bajas, 1 por nivel, dura 5 s, caduca a los 12 s |
  | Cadencia de disparo        | 0,2 s                                                   |
  | Espacio                    | Toroidal (los bordes envuelven)                         |
  | `dt` máximo por frame      | 50 ms                                                   |

- Componente cliente `app/components/game-canvas.tsx` que monta el canvas y el motor.
- `GamePlayer` usa el motor si el juego tiene uno registrado y la simulación si no.
- HUD React existente alimentado por el motor (puntuación, vidas, nivel) y un `hud-stat` nuevo "POWER" con `3x 4.2s` solo mientras el disparo triple está activo.
- El HUD y el texto "GAME OVER" pintados en el canvas del original **se eliminan**.
- Pausa con el botón PAUSA/REANUDAR y con las teclas `P` y `Escape`.
- Pausa automática al ocultarse la pestaña y al ocultarse la ruta. No se reanuda sola.
- Botón FIN: detiene el motor y abre el modal "FIN DEL JUEGO" con la puntuación actual.
- Al perder la última vida se abre el mismo modal. "JUGAR DE NUEVO" reinicia el motor desde cero.
- Guardado de puntuación con el `saveScore()` existente en `localStorage` (`av_scores`).
- Recoloreado neón con la paleta de `app/globals.css`. El diseño se hace con `/frontend-design`, como exige `CLAUDE.md`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles. En móvil el juego se ve pero no se puede jugar.
- Puntuaciones en Supabase, auth real y rankings reales. El ranking de la ficha sigue siendo `seededScores`.
- Motores reales para los otros juegos, incluido ROCAS (`rocas`), que sigue simulado.
- OVNIs u otros enemigos nuevos, sonido, música y nuevas mecánicas.
- Cambiar los textos fijos de la ficha de detalle ("TECLADO / TÁCTIL", "RETRO 1985").
- Tests automatizados.

---

## Modelo de datos

### Entrada de catálogo (`app/data/games.ts`)

Se inserta al principio de `GAMES`. Sigue el tipo `Game` sin cambios.

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Rota, propulsa y dispara en un campo de rocas sin fin.",
  long: "Una nave vectorial flota en un espacio sin bordes. Parte las rocas grandes en medianas y las medianas en pequeñas, recoge el núcleo 3x para disparar en abanico y sobrevive a cada oleada, más densa que la anterior.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 38600,
  plays: "1.2K",
}
```

Al ser la primera entrada, pasa a ser la pestaña por defecto de `HallOfFame` (usa `games[0]`) y la primera tarjeta de `/games` y de la home. Es intencionado.

### Contrato de motor (`app/lib/games/engine.ts`)

```ts
export type GameStats = {
  score: number;
  lives: number;
  level: number;
  power: number | null; // segundos restantes del disparo triple, redondeados a 0,1; null si no está activo
};

export type EngineEvents = {
  onStats: (stats: GameStats) => void; // solo cuando algún campo cambia, nunca en cada frame
  onGameOver: (finalScore: number) => void; // una sola vez por partida
};

export interface GameEngine {
  start(): void;   // arranca el bucle rAF y el input
  pause(): void;   // congela la simulación; cancela rAF y quita los listeners de teclado
  resume(): void;  // reanuda sin salto de dt (el primer frame tras reanudar usa dt = 0) y vuelve a poner los listeners
  end(): void;     // termina la partida (botón FIN) y emite onGameOver
  restart(): void; // partida nueva desde cero
  destroy(): void; // cancela rAF y quita todos los listeners
}

export type CreateEngine = (canvas: HTMLCanvasElement, events: EngineEvents) => GameEngine;
```

### Registro (`app/lib/games/registry.ts`)

```ts
export const ENGINES: Partial<Record<string, CreateEngine>> = {
  asteroides: createAsteroidsEngine,
};
```

### Motor de asteroides (`app/lib/games/asteroids/`)

| Fichero         | Contenido                                                                          |
| --------------- | ---------------------------------------------------------------------------------- |
| `constants.ts`  | `W = 800`, `H = 600`, radios, velocidades, puntos y constantes del power-up        |
| `entities.ts`   | Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` con `update(dt)` y `draw(ctx)` |
| `palette.ts`    | Colores neón del canvas (ver abajo)                                                |
| `input.ts`      | Teclado en `window` con `attach()` / `detach()`                                    |
| `index.ts`      | `createAsteroidsEngine: CreateEngine` con el estado, el bucle y las colisiones     |

- Sin globales de módulo mutables: todo el estado vive dentro de la instancia creada por `createAsteroidsEngine`. Dos montajes seguidos no comparten estado.
- `ctx` se pasa a `draw(ctx)`, en lugar de leerlo de un global.
- Estados internos: `"playing" | "dead" | "gameover"`, más un flag `paused`. El estado `"gameover"` ya no espera Espacio: emite `onGameOver` y sigue animando solo las partículas.
- Coordenadas lógicas 800×600, origen arriba a la izquierda. El canvas escala el buffer por `devicePixelRatio` (máximo 2) y se ajusta por CSS al 100 % de `.crt-screen`, que ya es 4:3.

### Paleta (`app/lib/games/asteroids/palette.ts`)

Valores literales de los tokens de `app/globals.css`, porque el canvas no lee variables de Tailwind. La combinación exacta y la intensidad del glow se cierran con `/frontend-design` en el paso 6.

| Elemento              | Color de partida             |
| --------------------- | ---------------------------- |
| Fondo                 | `#000` (el CRT pone el resto) |
| Nave                  | `--cyan` `#00f5ff`           |
| Llama del propulsor   | `--magenta` `#ff006e`        |
| Asteroides            | `--yellow` `#f5ff00`         |
| Balas                 | `--ink` `#e6e9ff`            |
| Power-up 3x           | `--green` `#00ff88`          |
| Partículas            | color del objeto que explota |

### Input

| Tecla           | Acción               | Quién la gestiona            |
| --------------- | -------------------- | ---------------------------- |
| `ArrowLeft/Right` | Rotar              | Motor (`input.ts`)           |
| `ArrowUp`       | Propulsar            | Motor                        |
| `Space`         | Disparar             | Motor                        |
| `KeyP`, `Escape` | Pausa / reanudar    | `GamePlayer`                 |

- Los listeners están en `window`, se registran en `start()`/`resume()`/`restart()` y se quitan en `pause()`/`end()`/`destroy()`. Así un motor en pausa no deja listeners aunque Next.js descarte la ruta oculta.
- Se llama a `preventDefault()` solo para esas teclas, para que flechas y Espacio no hagan scroll.
- Si el foco está en un `input`, `textarea` o elemento `contenteditable`, se ignoran (por ejemplo, las iniciales del modal).
- `blur` de la ventana limpia las teclas pulsadas, para que la nave no siga girando al volver.

---

## Plan de implementación

1. **Ficha y portada.** Añadir la entrada `asteroides` al principio de `GAMES` y la clase `.cover-asteroides` en `app/globals.css`, diseñada con `/frontend-design` en la línea de las demás portadas. Verificación: `/games`, `/games/asteroides`, `/salon` y la home muestran ASTEROIDES; `/games/asteroides/jugar` abre la simulación.
2. **Contrato.** Crear `app/lib/games/engine.ts` con los tipos y `app/lib/games/registry.ts` con `ENGINES` vacío. Verificación: `npx tsc --noEmit` pasa.
3. **Entidades.** Crear `constants.ts`, `palette.ts` y `entities.ts`, portando las clases de `game.js` a TypeScript con `draw(ctx)`. Todavía no las usa nadie.
4. **Motor.** Crear `input.ts` e `index.ts` con `createAsteroidsEngine`: estado por instancia, bucle rAF con `dt` ≤ 50 ms, colisiones, niveles, power-up, `onStats` solo en cambios y `onGameOver` una vez. Sin HUD ni overlay en el canvas. Registrarlo en `ENGINES`.
5. **Canvas y reproductor.** Crear `app/components/game-canvas.tsx`, que crea el motor una sola vez en un efecto (lo guarda en un ref) y lo pausa en el *cleanup*: al ocultarse la ruta con `<Activity>` la partida queda en pausa y se conserva al volver. Cambiar `GamePlayer`: si `ENGINES[game.id]` existe, renderiza `GameCanvas` en `.crt-screen` en lugar de `.game-arena`, no arranca el intervalo de simulación y toma puntuación, vidas, nivel y power de `onStats`. Conectar PAUSA, `P`/`Escape`, `visibilitychange`, FIN, fin por vidas y "JUGAR DE NUEVO". Añadir el `hud-stat` "POWER". Antes, leer en `node_modules/next/dist/docs/` la guía `preserving-ui-state`. Verificación: se juega una partida completa en `/games/asteroides/jugar` y los demás juegos siguen simulados.
6. **Diseño neón.** Ajustar la paleta y el glow del canvas (`shadowBlur` o doble trazo) con `/frontend-design`, comprobando legibilidad con las *scanlines* del CRT. Verificación visual en el navegador.

Cada paso deja la app arrancando con `npm run dev`.

---

## Criterios de aceptación

- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores y prerenderiza `/games/asteroides` y `/games/asteroides/jugar`.
- [ ] ASTEROIDES es la primera tarjeta en `/games` y aparece con la portada `cover-asteroides`.
- [ ] `/games/asteroides/jugar` muestra el canvas de juego dentro de `.crt-screen` y la consola del navegador no muestra errores.
- [ ] Las flechas rotan y propulsan la nave y Espacio dispara; ninguna de esas teclas hace scroll en la página.
- [ ] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100 en el HUD React.
- [ ] El HUD React muestra vidas y nivel del motor; perder una vida resta un corazón.
- [ ] Al vaciar el campo de asteroides, el nivel del HUD sube en 1 y aparecen `3 + nivel` asteroides grandes.
- [ ] Al recoger el power-up, el HUD muestra "POWER" con la cuenta atrás y la nave dispara 3 balas; al llegar a 0 el indicador desaparece.
- [ ] El canvas no pinta HUD ni el texto "GAME OVER".
- [ ] PAUSA, `P` y `Escape` congelan la partida y muestran "EN PAUSA"; REANUDAR, `P` o `Escape` la reanudan sin que la nave salte.
- [ ] Cambiar de pestaña y volver deja la partida en pausa.
- [ ] Navegar a otra ruta y volver con "atrás" deja la partida en pausa, sin dos bucles rAF activos (el movimiento va a la velocidad normal).
- [ ] Escribir en el input de iniciales del modal no mueve la nave ni dispara.
- [ ] Perder la tercera vida abre "FIN DEL JUEGO" con la puntuación final.
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar.
- [ ] "GUARDAR PUNTUACIÓN" añade a `av_scores` una entrada con `game: "asteroides"` y la puntuación mostrada.
- [ ] "JUGAR DE NUEVO" empieza una partida con puntuación 0, 3 vidas y nivel 01.
- [ ] Los otros 8 juegos (incluido `rocas`) siguen mostrando la simulación decorativa.
- [ ] La nave, los asteroides, las balas y el power-up usan los colores de `palette.ts`, no blanco.

---

## Decisiones

- **Sí:** entrada nueva `asteroides`, primera del catálogo. Es decisión del usuario.
- **No:** reutilizar o renombrar `rocas`. ROCAS sigue como juego simulado aparte.
- **Sí:** portada CSS nueva `cover-asteroides`.
- **No:** reutilizar `cover-rocas`; dos juegos con la misma portada se confundirían en la biblioteca.
- **Sí:** HUD y modal React alimentados por el motor. La plataforma ya tiene ese HUD y el modal de guardado.
- **No:** canvas autónomo con su propio HUD ni modelo mixto. Duplicarían la información y el flujo de guardado.
- **Sí:** contrato `GameEngine` y registro `ENGINES`. Los próximos juegos reales solo añaden un motor y una línea al registro.
- **No:** rama específica para `rocas`/`asteroides` dentro de `GamePlayer`, ni ocultar los juegos no jugables.
- **Sí:** motor en TypeScript puro en `app/lib/games/`, sin React. El bucle de 60 fps no pasa por el estado de React; solo los cambios de estadísticas.
- **No:** cargar `game.js` tal cual con `<Script>`. Usa globales, no se puede destruir y no se integra con el HUD.
- **Sí:** jugabilidad portada tal cual, incluido el disparo triple, más la pausa.
- **No:** quitar el power-up ni añadir OVNIs.
- **Sí:** solo teclado.
- **No:** controles táctiles en esta spec. Irán en una propia.
- **Sí:** puntuación en `localStorage` con `saveScore()`. Supabase irá en la spec de puntuaciones.
- **Sí:** teclado escuchado en `window` mientras la ruta está activa, ignorando inputs.
- **No:** exigir foco en el canvas con `tabIndex`. Obliga a un clic previo para jugar.
- **Sí:** pausa automática con `visibilitychange` y al ocultarse la ruta, sin reanudación automática.
- **Sí:** al ocultarse la ruta la partida se conserva en pausa (el *cleanup* pausa el motor en lugar de destruirlo).
- **No:** destruir el motor al ocultarse la ruta. Al volver con "atrás" se perdería la partida y el HUD mostraría la puntuación antigua.
- **Sí:** FIN termina la partida y abre el modal con la puntuación actual.
- **Sí:** recolorear a neón con la paleta de la plataforma, diseñado con `/frontend-design`.
- **No:** blanco sobre negro como el original.
- **Sí:** coordenadas lógicas fijas 800×600 escaladas por CSS. Encaja exacto en `.crt-screen` (4:3) y no cambia la física.

---

## Riesgos

| Riesgo                                                              | Mitigación                                                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `<Activity>` oculta la ruta y el efecto se re-ejecuta: bucles rAF duplicados o listeners huérfanos | El motor se crea una sola vez y el *cleanup* llama a `pause()`, que cancela rAF y quita los listeners de teclado; al volver no se crea un segundo motor. Criterio de aceptación dedicado. |
| Re-renders de React a 60 fps por las estadísticas                   | `onStats` solo emite cuando cambia algún campo; `power` va redondeado a 0,1 s.                       |
| Tras volver de una pausa larga, un `dt` enorme hace saltar la nave  | `resume()` reinicia la referencia de tiempo; `dt` sigue limitado a 50 ms.                            |
| Las *scanlines* y la viñeta del CRT reducen la legibilidad del trazo fino | Glow y grosor de línea se ajustan en el paso 6 con `/frontend-design`.                           |
| Teclas atascadas al perder el foco de la ventana                    | `blur` limpia el estado de teclas.                                                                   |
| La ficha anuncia "TECLADO / TÁCTIL" pero no hay táctil              | Aceptado en esta spec; se corrige con la spec de controles táctiles.                                |

---

## Qué **no** entra en esta spec

- Controles táctiles.
- Puntuaciones en Supabase, auth y rankings reales.
- Motores reales para ROCAS y el resto del catálogo.
- OVNIs, sonido, música o mecánicas nuevas.
- Cambios en los textos fijos de la ficha de detalle.
- Tests automatizados.

Cada una de esas cosas, si llega, irá en su propia spec.
