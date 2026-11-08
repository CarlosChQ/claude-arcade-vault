# SPEC 02 — Home: landing page de Arcade Vault

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-08
> **Objetivo:** Portar la Home de `references/resources/templates/home-about/home.jsx` a la ruta `/` y mover la Biblioteca y sus rutas hijas bajo `/games`.

---

## Por qué existe esta spec

La SPEC 01 dejó la Biblioteca en `/`, porque la plantilla original no tenía landing.
La nueva plantilla `home-about/` añade una Home de presentación (hero, ventajas, juegos, actividad, precios y CTA final) y un enlace "Inicio" en el nav.
Para que el logo e "Inicio" lleven a la landing, la Biblioteca cambia de URL a `/games`, y el detalle y el reproductor se anidan debajo para que la lista sea padre del detalle.

---

## Alcance

**Dentro:**

- Nueva Home en `/` con las siete secciones de `home.jsx`, en el mismo orden:

  | Sección                      | Contenido                                                                                  |
  | ---------------------------- | ------------------------------------------------------------------------------------------ |
  | Hero                         | Siluetas pixel flotantes (8 SVG), "▸ INSERTA UNA MONEDA_", título de 3 líneas, subtítulo, CTAs "EXPLORAR JUEGOS" y "CREAR CUENTA", indicador "DESLIZA ▼" |
  | `// 01` ¿Por qué Arcade Vault? | 4 tarjetas con icono pixel (GAMEPAD, FREE, TROPHY, ROCKET)                                |
  | `// 02` Juegos disponibles   | Los 6 primeros juegos de `getGames()` como mini-tarjetas + botón "VER TODOS LOS JUEGOS →"   |
  | Estadísticas                 | 3 bloques fijos: "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING"                       |
  | `// 03` Actividad en vivo    | "Últimas puntuaciones" (7 filas) y "Top jugadores · hoy" (5 filas con barra) + "VER SALÓN →" |
  | `// 04` Precios              | Tarjeta "JUGADOR VAULT $0" con sello "FREE PLAY" y 3 preguntas frecuentes                  |
  | CTA final                    | "¿LISTO PARA JUGAR?" + "INSERTAR MONEDA →"                                                 |

- Animación *reveal* al hacer scroll (las secciones aparecen al entrar en pantalla), como en la plantilla.
- Cambio de rutas:

  | Antes                 | Después               |
  | --------------------- | --------------------- |
  | `/` (Biblioteca)      | `/games`              |
  | `/juegos/[id]`        | `/games/[id]`         |
  | `/juegos/[id]/jugar`  | `/games/[id]/jugar`   |
  | —                     | `/` (Home)            |

- La Biblioteca se mueve tal cual a `/games`, con su hero actual ("ARCADE VAULT" con *flicker* + "INSERTA UNA MONEDA PARA JUGAR").
- Nav (escritorio y panel móvil): enlace nuevo "Inicio" → `/` como primer enlace; "Biblioteca" → `/games`.
- `/acceso?modo=crear` abre la pestaña CREAR CUENTA. Lo usan los CTAs "CREAR CUENTA" y "EMPEZAR GRATIS".
- Actualizar todos los enlaces internos que apuntaban a `/` o `/juegos/...` cuando significaban "Biblioteca" o "juego".
- Estilos nuevos de la Home copiados de `home-about/styles.css` a `app/globals.css`.

**Fuera de alcance (para specs futuras):**

- Página "Acerca de" / contacto (`about.jsx`). Irá en la SPEC 03. El nav **no** muestra "Acerca de" hasta entonces.
- Clases `about-*`, `contact-*`, `highlight-*`, `div-*`, `gp-*` y `dp-*` de `home-about/styles.css`.
- Sincronizar cambios de la nueva `styles.css` en clases que ya están portadas en `globals.css`.
- Datos reales en "Actividad en vivo": son literales de la plantilla, no salen de `seededScores` ni de `av_scores`.
- Que las cifras de "Estadísticas" (12+, MILES…) se calculen; son texto fijo.
- Redirecciones de las URLs antiguas `/juegos/*` (no hay usuarios ni enlaces externos todavía).
- Sistema de créditos, auth real, backend.
- Rediseño estético: se replica la plantilla.
- Tests automatizados.

---

## Modelo de datos

Archivo nuevo `app/data/home.ts` con los literales de "Actividad en vivo", copiados de `home.jsx`:

```ts
import type { AccentColor } from "./games";

export type RecentScore = {
  player: string;      // "NEONFOX"
  game: string;        // "Caída" (texto, no id)
  score: number;       // 184220
  ago: string;         // "hace 2 min"
  color: AccentColor;
};

export type TopPlayer = { rank: number; player: string; score: number };

export const RECENT_SCORES: RecentScore[]; // 7 filas, mismo orden que la plantilla
export const TOP_PLAYERS: TopPlayer[];     // 5 filas, NEONFOX 312840 … GLITCHA 138900
```

Las puntuaciones se formatean con `formatScore` de `app/data/games.ts` (no con `toLocaleString`).
La anchura de la barra del top es `100 - i * 16` %, calculada en el render.

Los textos de ventajas, estadísticas, precios y FAQ son copy de la página y viven en el propio componente, no en `app/data/`.

Cambio de copy respecto a la plantilla: la tarjeta "JUEGOS CLÁSICOS" dice _"Bloque Buster, Caída, Serpentina y muchos más. Los mejores arcades de todos los tiempos en un solo lugar."_ en vez de nombrar juegos comerciales.

`/acceso` acepta el *search param* `modo`:

```ts
// "/acceso"             → pestaña "in" (INICIAR SESIÓN), como hoy
// "/acceso?modo=crear"  → pestaña "up" (CREAR CUENTA)
// cualquier otro valor  → "in"
```

No hay datos persistentes nuevos. `av_user` y `av_scores` no cambian.

---

## Plan de implementación

1. **Mover rutas de juego.** Renombrar `app/juegos/` a `app/games/` y cambiar `PageProps<"/juegos/...">` por `PageProps<"/games/...">`. Actualizar `game-card.tsx` (`/games/${id}`), `game-player.tsx` (SALIR → `/games/${id}`) y el botón "JUGAR AHORA" del detalle. Verificación: `npx next typegen && npx tsc --noEmit` pasa y `/games/caida` carga.
2. **Mover la Biblioteca.** Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero + `<Library>`) y `metadata.title` "Biblioteca · Arcade Vault". Dejar `app/page.tsx` como placeholder temporal con un enlace a `/games`.
3. **Enlaces "volver a la Biblioteca".** Cambiar a `/games`: "VOLVER AL VAULT" del detalle y del reproductor, el enlace de `app/not-found.tsx`, el botón de `app/salon/page.tsx` y los dos `router.push("/")` de `auth-form.tsx` (tras iniciar sesión o jugar como invitado se sigue yendo a la Biblioteca).
4. **Nav.** En `nav.tsx`, añadir la sección `"inicio"` (activa solo en `/`), "Inicio" como primer enlace en escritorio y panel móvil, y "Biblioteca" → `/games`, activa en `/games` y `/games/*`. El logo sigue llevando a `/`.
5. **`?modo=crear` en Acceso.** `auth-form.tsx` lee `modo` con `useSearchParams` para el estado inicial de la pestaña. `app/acceso/page.tsx` envuelve `<AuthForm />` en `<Suspense>` para que `next build` no falle por *search params* fuera de Suspense con `cacheComponents`.
6. **Estilos.** Copiar de `home-about/styles.css` a `app/globals.css` solo los bloques de la Home: `.home*`, `.hero-eyebrow`, `.hero-scroll`, `.silo`/`.home-silos`, `.section-head`/`.kicker`/`.section-title`/`.section-rule`, `.feature-*`/`.ft-*`, `.mini-*`, `.stats-inner`/`.stat-*`, `.activity-*`/`.ac-*`/`.ticker`/`.tick-row`/`.tk-*`/`.top-*`/`.tp-*`/`.lb-link`, `.pricing-*`/`.price-card`/`.pc-*`/`.faq-*`, `.final-*`, `.reveal` y sus `@keyframes` y `@media`. Antes de pegar cada bloque, comprobar que el selector no existe ya en `globals.css`.
7. **Datos y piezas.** Crear `app/data/home.ts` (Modelo de datos). Crear `app/components/home-art.tsx` (Server: `FloatingSilhouettes` y `FeatureIcon`, SVG copiados de la plantilla) y `app/components/mini-card.tsx` (Server: `<Link href="/games/[id]">` con portada `cover-bg` + título + categoría).
8. **Reveal.** Crear `app/components/reveal.tsx` (`"use client"`): envuelve una sección, observa **su propio** elemento con `IntersectionObserver` (umbral 0,12), añade `in` una vez y desconecta en el *cleanup*. Acepta `as`/`className` para renderizar el `<section>` con las clases de la plantilla. Una vez visible queda visible al volver con `<Activity>`.
9. **Home.** Reescribir `app/page.tsx` (Server Component, `metadata.title` "Arcade Vault · Portal Retro") con las siete secciones. CTAs: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" → `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS" → `/acceso?modo=crear`; "VER SALÓN" → `/salon`. Todos son `<Link>`, no `onClick`. Los `style={{ transitionDelay / animationDelay / width }}` dinámicos se mantienen inline; los estáticos (`textAlign`, `marginTop`, `width: 100%`) pasan a Tailwind.
10. **Pulido con `/frontend-design`.** Comparar `/` con `home-about/arcade-vault-standalone.html` en el navegador a 1440 px y 375 px. Corregir diferencias visuales sin cambiar la estética.

Cada paso deja la app arrancando con `npm run dev`.

---

## Criterios de aceptación

- [ ] `npx next typegen && npx tsc --noEmit` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de prerender y lista `/`, `/games`, `/acceso`, `/salon` y las 8 rutas `/games/[id]` y `/games/[id]/jugar`.
- [ ] No existe la carpeta `app/juegos/` y `grep -rn "/juegos" app` no devuelve resultados.
- [ ] `/juegos/caida` muestra la 404 temática.
- [ ] Ninguna pantalla muestra errores ni avisos de hidratación en la consola del navegador.
- [ ] `/` muestra el hero con "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", las 8 siluetas y las secciones `// 01` a `// 04` más el CTA final, en ese orden.
- [ ] La tarjeta "JUEGOS CLÁSICOS" no menciona Arkanoid, Tetris ni Snake.
- [ ] `// 02` muestra exactamente 6 mini-tarjetas; clic en una lleva a `/games/<id>` de ese juego.
- [ ] "Últimas puntuaciones" muestra 7 filas y la primera es "NEONFOX ▸ Caída +184.220 hace 2 min".
- [ ] "Top jugadores · hoy" muestra 5 filas, de "#01 NEONFOX 312.840" a "#05 GLITCHA 138.900", con barras de 100 %, 84 %, 68 %, 52 % y 36 %.
- [ ] Al cargar `/`, las secciones bajo el hero están ocultas y aparecen con la transición al hacer scroll hasta ellas.
- [ ] Navegar de `/` a `/games` y volver con el botón atrás deja visibles las secciones ya reveladas.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" llevan a `/games`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS" llevan a `/acceso?modo=crear` con la pestaña CREAR CUENTA activa y el campo de correo visible.
- [ ] `/acceso` sin parámetro abre INICIAR SESIÓN, como antes.
- [ ] "VER SALÓN →" lleva a `/salon`.
- [ ] `/games` muestra el hero "ARCADE VAULT" y la Biblioteca con los mismos filtros y resultados que tenía `/` en la SPEC 01.
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" (sin "Acerca de"); "Inicio" está activo en `/`, "Biblioteca" en `/games` y `/games/*`.
- [ ] El logo lleva a `/`.
- [ ] Iniciar sesión o "JUGAR COMO INVITADO" en `/acceso` lleva a `/games`.
- [ ] "VOLVER AL VAULT" del detalle y del reproductor, y el enlace de la 404, llevan a `/games`.
- [ ] A 375 px no hay scroll horizontal en `/`; la rejilla de ventajas pasa a 1 columna, las mini-tarjetas a 2 y actividad y precios a 1.
- [ ] El panel móvil incluye "Inicio" y elegir una opción navega y lo cierra.

---

## Decisiones

- **Sí:** Home en `/` y Biblioteca en `/games`. Decisión del usuario: el logo e "Inicio" llevan a la landing, como en la plantilla.
- **No:** Home en `/inicio` con la Biblioteca en `/`. El logo no llevaría a la landing.
- **Sí:** detalle y reproductor bajo `/games/[id]` y `/games/[id]/jugar`. La lista es padre del detalle y las URLs son coherentes entre sí.
- **No:** dejar `/juegos/[id]` intacto. Mezcla dos prefijos para el mismo recurso.
- **No:** `/juegos` para la Biblioteca. El usuario eligió `/games`. Esto revierte para este recurso la decisión de la SPEC 01 de rutas solo en español; `/acceso` y `/salon` no cambian.
- **No:** redirecciones de `/juegos/*` a `/games/*`. No hay enlaces externos que proteger todavía.
- **Sí:** "Acerca de" en una spec propia (SPEC 03), sin enlace en el nav hasta entonces. Evita un enlace que lleve a la 404.
- **No:** Home y Acerca de en la misma spec. Dos rutas y un formulario con validación la harían demasiado grande.
- **Sí:** "Actividad en vivo" con literales de la plantilla en `app/data/home.ts`. Server Component, sin aleatoriedad ni riesgo de hidratación, y en el mismo directorio donde entrará la BD.
- **No:** generar la actividad con `seededScores` ni leer `av_scores`. Lo primero cambia los números de la plantilla; lo segundo exige cliente y adelanta "puntuaciones reales", que es otra spec.
- **Sí:** nombrar juegos del catálogo (Bloque Buster, Caída, Serpentina) en "JUEGOS CLÁSICOS". Coherente con el vault y evita marcas comerciales ajenas.
- **Sí:** copiar a `globals.css` solo las clases de la Home. Menos riesgo de regresiones en las pantallas de la SPEC 01.
- **No:** sincronizar `styles.css` entero. Trae clases de About y de componentes no usados (`gp-*`, `dp-*`).
- **Sí:** `/acceso?modo=crear` para abrir CREAR CUENTA desde los CTAs. Cambio pequeño en `auth-form.tsx` y el CTA cumple lo que promete.
- **Sí:** el hero actual de la Biblioteca se mueve con ella a `/games`. La Biblioteca no cambia visualmente.
- **Sí:** tras iniciar sesión o jugar como invitado se va a `/games`. Mantiene el comportamiento de la SPEC 01 ("vuelve a la Biblioteca") ahora que `/` es la Home.
- **Sí:** un componente `<Reveal>` por sección que observa su propio elemento. La plantilla hace `querySelectorAll(".reveal")` global, que en Next.js podría tocar nodos de rutas ocultas por `<Activity>`.
- **Sí:** CTAs y mini-tarjetas como `<Link>`. Prefetch, enlaces reales y la Home puede ser Server Component salvo `<Reveal>`.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `useSearchParams` en `auth-form` hace fallar `next build` con `cacheComponents` | `<Suspense>` alrededor de `<AuthForm />` en `app/acceso/page.tsx` (paso 5), con un fallback del mismo alto que la tarjeta. |
| Con JavaScript desactivado o si el observer falla, las secciones `.reveal` quedan invisibles (`opacity: 0`) | Se acepta, igual que la plantilla. Si molesta en el pulido, aplicar `opacity: 0` solo cuando el componente ya ha montado. |
| `<Activity>` re-ejecuta el efecto de `<Reveal>` al volver a `/` y vuelve a ocultar secciones | La clase `in` se guarda en estado y no se quita nunca; el efecto solo observa si aún no es visible. Criterio de aceptación específico. |
| Selectores de `home-about/styles.css` que ya existen en `globals.css` con otro valor (`.section-head`, `.kicker`, `.btn.xl`…) | El paso 6 compara antes de pegar; si existe, se conserva el de `globals.css` y se anota la diferencia para el pulido. |
| Al mover `app/juegos` quedan enlaces rotos | Criterio `grep -rn "/juegos" app` sin resultados y `/juegos/caida` devuelve 404. |
| "12+ JUEGOS" con solo 8 juegos en el catálogo | Se acepta: es copy de marketing de la plantilla. |

---

## Qué **no** entra en esta spec

- Página "Acerca de" y formulario de contacto (SPEC 03).
- Clases de About, `gp-*` y `dp-*`.
- Datos reales o calculados en Actividad y Estadísticas.
- Redirecciones desde `/juegos/*`.
- Sistema de créditos, auth real, backend.
- Rediseño visual.
- Tests automatizados.

Cada uno de estos puntos, si llega, irá en su propia spec.
