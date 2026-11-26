# Plantilla de spec de juego

Rellena cada `<…>`. Borra las líneas marcadas con `[si …]` cuando no apliquen, y deja dicho de forma explícita lo que no entra. Mantén el estilo de SPEC 05: frases cortas, tablas con valores literales y nombres reales de ficheros.

---

```markdown
# SPEC NN — <TÍTULO>: <frase corta>

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** <fecha del contexto de la sesión>
> **Objetivo:** <Una frase: qué juego se juega dónde, de dónde sale y qué entrada del catálogo usa.>

---

## Por qué existe esta spec

<De dónde sale el juego (carpeta de referencia o idea original) y cómo está hecho: tamaño del canvas, globales, HUD pintado, bucle sin fin, assets.>
<Qué entrada del catálogo usa: fila nueva, o la entrada simulada `<id>` que pasa a tener motor real.>
<Qué cambia en el contrato, si cambia (p. ej., "Es el primer juego sin vidas, así que generaliza el HUD").>

---

## Alcance

**Dentro:**

- <[fila nueva] Entrada nueva `<id>` en la tabla `games`, en la posición <n>, con portada CSS nueva `cover-<id>>`.>
- <[reutiliza] La entrada `<id>` (<TÍTULO>) pasa de simulación a motor real. Se conservan su fila y sus marcas.>
- <[si hace falta] Generalizar el HUD: `GameStats` cambia `power` por `extras` y `lives: number | null`. Asteroides se migra sin cambios visibles.>
- Motor en TypeScript en `app/lib/games/<id>/`, con estas reglas:

  | Regla          | Valor            |
  | -------------- | ---------------- |
  | <Puntuación>   | <valores>        |
  | <Vidas>        | <n o "sin vidas">|
  | <Niveles>      | <regla>          |
  | <…>            | <…>              |
  | `dt` máximo por frame | 50 ms     |

- Registro en `ENGINES` (`app/lib/games/registry.ts`).
- HUD React: puntuación, <vidas>, nivel y <extras>.
- <Lo que pintaba la referencia en el canvas> **se elimina**.
- Guardado y ranking con lo de SPEC 06, sin cambios de código: `submitScore` y la pestaña `<id>` del Salón.
- <[assets] Assets copiados a `public/games/<id>/`.>
- Recoloreado neón con la paleta de `app/globals.css`, diseñado con `/frontend-design`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles.
- <Sonido y música.> <!-- salvo que se haya decidido que entra -->
- Ranking real en la ficha `/games/[id]` (sigue con `seededScores`).
- <Mecánicas descartadas en las preguntas.>
- Tests automatizados.

---

## Modelo de datos

### Entrada de catálogo (`public.games`)

<[fila nueva]>

| Columna       | Valor                  |
| ------------- | ---------------------- |
| `id`          | `<id>`                 |
| `title`       | `<TÍTULO>`             |
| `summary`     | `<resumen de tarjeta>` |
| `description` | `<descripción larga>`  |
| `cat`         | `<CAT>`                |
| `cover`       | `cover-<id>`           |
| `color`       | `<color>`              |
| `best`        | `<n>`                  |
| `plays`       | `<"n.nK">`             |
| `sort_order`  | `<n>`                  |

<Cómo se coloca (al final, o desplazando `sort_order` si va primero).>

<[reutiliza] Se usa la fila `<id>` tal cual. Sin `insert` ni cambios de esquema.>

### <[si hace falta] Contrato de HUD (`app/lib/games/engine.ts`)>

<Tipos `HudExtra` y `GameStats` de `integracion.md`, punto 5, y la migración de Asteroides.>

### Motor (`app/lib/games/<id>/`)

| Fichero        | Contenido |
| -------------- | --------- |
| `constants.ts` | <…>       |
| `entities.ts`  | <…>       |
| `palette.ts`   | <…>       |
| `input.ts`     | <…>       |
| `index.ts`     | `create<Nombre>Engine: CreateEngine` con <…> |

- Sin globales de módulo mutables.
- Área lógica de 800×600. <Cómo encaja el juego: tablero centrado, paneles laterales, letterbox…>
- Estados internos: <…>, más un flag `paused`. El fin emite `onGameOver` una vez y no espera teclas.
- La puntuación se limita a `MAX_SCORE`.

### Estadísticas que emite

| Campo    | Valor                          |
| -------- | ------------------------------ |
| `score`  | <…>                            |
| `lives`  | <n o `null`>                   |
| `level`  | <…>                            |
| `extras` | <`[{ label, value, tone }]` y cuándo aparecen> |

### Paleta (`app/lib/games/<id>/palette.ts`)

| Elemento | Color de partida     |
| -------- | -------------------- |
| Fondo    | `#000`               |
| <…>      | <token y hex>        |

La combinación exacta y el glow se cierran con `/frontend-design`.

### Input

| Tecla     | Acción       | Quién la gestiona |
| --------- | ------------ | ----------------- |
| <…>       | <…>          | Motor (`input.ts`)|
| `KeyP`, `Escape` | Pausa / reanudar | `GamePlayer` |

- Listeners en `window`, con `attach()`/`detach()` según `start`/`pause`/`resume`/`end`/`restart`/`destroy`.
- `preventDefault()` solo para las teclas de juego. Se ignoran con el foco en un campo de texto. `blur` suelta las teclas.

### <[assets] Assets>

| Origen en la referencia | Destino                  | Uso   |
| ----------------------- | ------------------------ | ----- |
| `<ruta>`                | `public/games/<id>/<…>`  | <…>   |

<Cómo se cargan y qué pasa mientras cargan.>

---

## Plan de implementación

1. **Catálogo y portada.** <[fila nueva] `insert` en `games` con `execute_sql` y `.cover-<id>` en `app/globals.css`, diseñada con `/frontend-design`.> <[reutiliza] Comprobar que la fila `<id>` existe; sin cambios.> Verificación: `/games`, `/games/<id>`, `/salon` y la home muestran el juego; `/games/<id>/jugar` abre la simulación. (Reiniciar `next dev`: el catálogo está cacheado.)
2. <[si hace falta] **Generalizar el HUD.** Cambiar `GameStats`, adaptar `GamePlayer` y migrar Asteroides a `extras`. Verificación: `npx tsc --noEmit` pasa y el HUD de Asteroides se ve igual.>
3. **Constantes y entidades.** Crear `constants.ts`, `palette.ts` y `entities.ts`, <portando las de `game.js`>. Todavía no las usa nadie.
4. **Motor e input.** Crear `input.ts` e `index.ts` con `create<Nombre>Engine`: estado por instancia, rAF con `dt` ≤ 50 ms, <reglas>, `onStats` solo en cambios y `onGameOver` una vez. Sin HUD en el canvas.
5. **Registro y reproductor.** Añadir `<id>` a `ENGINES`. Verificación: se juega una partida completa en `/games/<id>/jugar`, se guarda la puntuación y aparece en `/salon`.
6. <[assets] **Assets.** Copiar a `public/games/<id>/` y cargarlos en el motor. Verificación: sin errores 404 en la consola.>
7. **Diseño neón.** Ajustar la paleta y el glow con `/frontend-design` bajo las scanlines del CRT. Verificación visual en el navegador.

Cada paso deja la app arrancando con `npm run dev` y `.env.local` válido.

---

## Criterios de aceptación

- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] Con `.env.local` válido, `npm run build` termina sin errores y prerenderiza `/games/<id>` y `/games/<id>/jugar`.
- [ ] <[fila nueva] `/games` muestra <TÍTULO> en la posición <n> con la portada `cover-<id>`.>
- [ ] `/games/<id>/jugar` muestra el canvas dentro de `.crt-screen` y la consola no muestra errores.
- [ ] <Una línea por cada control: qué tecla hace qué.> Ninguna tecla de juego hace scroll.
- [ ] <Una línea por cada regla de puntuación de la tabla, comprobable en el HUD.>
- [ ] <Vidas: perder una resta un corazón / el HUD no muestra vidas.>
- [ ] <Niveles: cómo se sube y qué cambia.>
- [ ] <Una línea por cada extra del HUD: cuándo aparece y qué muestra.>
- [ ] El canvas no pinta HUD, "GAME OVER" ni pantallas de pausa o inicio.
- [ ] PAUSA, `P` y `Escape` congelan la partida y muestran "EN PAUSA"; al reanudar no hay salto.
- [ ] Cambiar de pestaña y volver deja la partida en pausa.
- [ ] Navegar a otra ruta y volver con "atrás" deja la partida en pausa, sin dos bucles rAF activos.
- [ ] Escribir en el input de iniciales del modal no mueve el juego.
- [ ] <Condición de derrota> abre "FIN DEL JUEGO" con la puntuación final.
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar.
- [ ] Guardar una partida de `<id>` con el nombre `neo` crea en `scores` una fila con `game_id = '<id>'`, `name = 'NEO'` y la puntuación del modal.
- [ ] Tras guardar, navegar a `/salon` muestra la marca en la pestaña <TÍTULO> sin recargar.
- [ ] <[reutiliza] Las marcas anteriores de `<id>` siguen en el Salón.>
- [ ] "JUGAR DE NUEVO" empieza una partida desde cero.
- [ ] <[HUD generalizado] El HUD de Asteroides se ve igual que antes.>
- [ ] Los demás juegos con motor siguen funcionando y los simulados siguen con la simulación.
- [ ] Los elementos usan los colores de `palette.ts`.

---

## Decisiones

- **Sí:** <entrada nueva / reutilizar `<id>`>. Es decisión del usuario.
- **No:** <la alternativa descartada y por qué>.
- **Sí:** motor en TypeScript puro en `app/lib/games/<id>/` con el contrato `GameEngine`, y HUD y modal React.
- **No:** cargar `game.js` con `<Script>` ni mantener el HUD en el canvas.
- **Sí:** leaderboard de SPEC 06 sin cambios de código.
- <Una pareja **Sí/No** por cada respuesta de las preguntas: reglas, controles, encaje, assets, sonido, estilo.>

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| El catálogo está cacheado (`cacheLife("hours")`) y el juego no aparece tras el `insert` | Reiniciar `next dev`. En producción aparece en menos de una hora o con un despliegue. |
| `<Activity>` oculta la ruta: bucles rAF duplicados o listeners huérfanos | `GameCanvas` crea el motor una vez y lo pausa en el *cleanup*. Criterio de aceptación dedicado. |
| Re-renders a 60 fps por las estadísticas | `onStats` solo emite en cambios; los valores continuos van redondeados. |
| Una puntuación fuera de rango rompe el guardado | El motor la limita a `MAX_SCORE`. |
| <Riesgos propios del juego: encaje del tablero, assets que no cargan, sonido bloqueado por autoplay…> | <…> |

---

## Qué **no** entra en esta spec

- Controles táctiles.
- <Sonido y música.>
- Ranking real en la ficha y en la home.
- <Mecánicas descartadas.>
- Tests automatizados.

Cada uno de estos puntos, si llega, irá en su propia spec.
```
