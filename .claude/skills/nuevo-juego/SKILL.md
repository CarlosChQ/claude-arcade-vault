---
name: nuevo-juego
description: Diseña la spec de un juego real para Arcade Vault (motor en canvas, entrada en el catálogo de Supabase, portada, HUD y leaderboard), partiendo de una carpeta de references/started-games o de una idea original. Hace preguntas antes de escribir y solo genera el fichero en specs/. Úsalo antes de portar o crear un juego.
disable-model-invocation: true
argument-hint: '<carpeta de references/started-games (p. ej. 03-tetris) o descripción del juego>'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), mcp__supabase__execute_sql
---

# /nuevo-juego — Spec de un juego real con su leaderboard

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No existe references/started-games/"`

Contrato actual de motor:
!`cat app/lib/games/engine.ts 2>/dev/null || echo "No existe app/lib/games/engine.ts"`

Motores registrados:
!`cat app/lib/games/registry.ts 2>/dev/null || echo "No existe app/lib/games/registry.ts"`

---

Este skill produce **una spec** para que un juego se pueda jugar de verdad en Arcade Vault y compita en el Salón de la Fama. **Aquí no se escribe código.** Termina cuando el fichero `specs/NN-juego-<slug>.md` está guardado. La implementación se hace después con `/spec-impl`.

Todo juego real se integra igual que ASTEROIDES (SPEC 05) y usa el catálogo y el leaderboard de SPEC 06. Esas dos specs son el modelo de estilo, de idioma y de nivel de detalle. Los puntos de integración obligatorios están en `integracion.md` y la estructura de la spec en `template.md`, los dos en la carpeta de este skill.

Responde siempre en el idioma del usuario.

## Fase 1 — Contexto

1. Lee `CLAUDE.md`, `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-catalogo-supabase.md`. Si hay specs de juego más recientes (`specs/NN-juego-*.md`), lee también la última: puede haber cambiado el contrato.
2. Lee `integracion.md` y `template.md`.
3. Consulta el catálogo real con `mcp__supabase__execute_sql`:

   ```sql
   select id, title, cat, cover, color, sort_order from games order by sort_order;
   ```

   Un juego tiene motor real si su `id` está en `ENGINES` (ver "Motores registrados" arriba). Los demás son simulaciones decorativas.
4. Mira en "Contrato actual de motor" si `GameStats` todavía tiene `power` o si ya tiene `extras` y `lives: number | null`. Eso decide si la spec incluye el paso "Generalizar el HUD" (ver `integracion.md`, punto 5).

Si `$ARGUMENTS` viene vacío, pregunta si el juego sale de `references/started-games/` (ofrece las carpetas del contexto) o es original, y pide una descripción de una frase.

## Fase 2 — Origen del juego

### Con referencia (`references/started-games/<carpeta>`)

Lee `README.md`, `CLAUDE.md`, `index.html`, `game.js` y los ficheros auxiliares (`levels.js`, `style.css`, `assets/`). Ignora `__MACOSX` y `.DS_Store`. Extrae y anota:

- **Reglas y constantes**, con sus valores literales del código (puntos, velocidades, vidas, niveles, tiempos, probabilidades). Irán en la tabla de reglas de la spec.
- **Controles**: qué teclas usa y para qué.
- **Tamaño del canvas** y si es 4:3. `.crt-screen` es 4:3 y el área lógica es de 800×600.
- **Lo que pinta en el canvas y debe desaparecer**: HUD, "GAME OVER", pantallas de pausa o de inicio, pieza siguiente o marcadores que pasarán al HUD React.
- **Globales y bucle**: variables de módulo, `window` como input, `requestAnimationFrame` sin cancelar, esperas de tecla para reiniciar.
- **Assets**: sprites, spritesheets, sonidos, fuentes. Anota las rutas y los tamaños.
- **Estados**: inicio, jugando, pausa, perder vida, fin.

### Sin referencia

Define las reglas con preguntas en la Fase 3: objetivo, cómo se puntúa, cómo se pierde, cómo se sube de nivel, controles y entidades.

En ambos casos el juego lleva **nombre, textos y arte propios**, al estilo del catálogo (títulos en español y en mayúsculas, como ASTEROIDES o CAÍDA). No copies marcas, personajes, arte ni música de un juego comercial concreto.

### Equivalente simulado

Compara el juego con las entradas del catálogo que **no** tienen motor. Por ejemplo, un juego de piezas que caen se parece a `caida` (CAÍDA) y uno de romper bloques con paleta a `bloque-buster` (BLOQUE BUSTER). Si hay un candidato, la primera pregunta de la Fase 3 es si se reutiliza.

## Fase 3 — Preguntas

Usa `AskUserQuestion` en bloques de 3 o 4 preguntas, con 2–4 opciones concretas, tu recomendación primero y marcada con "(Recomendado)". Espera la respuesta de cada bloque antes del siguiente. No preguntes lo que ya responde la referencia o el código.

**Bloque 1 — Catálogo e identidad**

- **Entrada**: si hay equivalente simulado, ofrece "dar motor real a `<id>`" o "crear una fila nueva". **Pregúntalo siempre**, no lo decidas tú.
- Si es una fila nueva: `id` (slug en kebab-case, sin tildes), `title`, `cat` (`ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`), `color` (`cyan`, `magenta`, `yellow`, `green`) y posición en el catálogo (primera o al final). Propón valores. `summary` y `description` los redactas tú en el tono del catálogo y el usuario los revisa en la spec.
- Si se reutiliza: si se mantiene título, textos y portada o si se rediseñan.

**Bloque 2 — Reglas**

- Lo que la referencia no deja claro o lo que conviene cambiar al portarlo (p. ej., esperar una tecla para empezar: en la plataforma la partida empieza al entrar).
- Si se conserva todo tal cual o se quita o añade alguna mecánica. Lo nuevo y grande se propone para otra spec.

**Bloque 3 — HUD, controles y encaje**

- **HUD**: qué `extras` muestra React además de puntuación y nivel (líneas, bloques restantes, power-up activo…). La pieza siguiente u otras previsualizaciones gráficas se pintan en el canvas, en un panel lateral, y no son HUD de texto.
- **Vidas**: número de vidas, o `lives: null` si el juego no las tiene (el HUD oculta los corazones).
- **Controles**: teclas del motor. `P` y `Escape` están reservadas para la pausa de `GamePlayer`. Si la referencia las usa, propone otra tecla o quítalas.
- **Encaje**: si la referencia no es 4:3, cómo cabe en 800×600 (tablero centrado con paneles laterales, letterbox o rediseño del área).

**Bloque 4 — Assets, sonido y diseño** (solo si aplica)

- **Assets** de la referencia: copiarlos a `public/games/<id>/` o redibujarlos en vectores neón.
- **Sonido**: fuera de alcance (como SPEC 05) o dentro, con un botón de silencio y volumen bajo por defecto.
- **Estilo**: recolorear con la paleta neón (por defecto) o mantener los sprites originales.

Para de preguntar cuando puedas responder sin suponer nada:

1. Qué ficheros aparecen o cambian.
2. Cuál es el primer paso y cuál el último.
3. Cómo se verifica que está terminado.

Si una respuesta abre algo grande (multijugador, táctil, ranking por niveles…), señala que merece su propia spec y déjalo fuera.

## Fase 4 — Escribir y guardar la spec

1. Rellena `template.md` entero. Cada punto de `integracion.md` tiene que estar en la spec: en el alcance, en el modelo de datos, como paso del plan o como criterio de aceptación. Lo que no aplique se dice de forma explícita (p. ej., "Sin assets: el juego se dibuja con vectores").
2. Incluye el paso "Generalizar el HUD" solo si `engine.ts` todavía tiene `power`. Si ya tiene `extras`, usa el contrato tal como está.
3. Número: el más alto de `specs/` más uno, con dos dígitos. Nombre: `specs/NN-juego-<id>.md`. Si el fichero ya existe, pregunta.
4. Cabecera: estado `Borrador`, `Depende de: SPEC 05, SPEC 06` (más la última spec de juego si cambió el contrato) y la fecha del contexto de la sesión.
5. Escribe el fichero directamente, sin pedir permiso ni enseñar un borrador antes.
6. Confirma al usuario:
   - La ruta del fichero.
   - Que está en `Borrador` y debe pasar a `Aprobado` cuando la revise.
   - El siguiente paso: `/spec-impl NN-juego-<id>`.
   - **Para aquí.** No propongas implementarla.

## Reglas

- **No escribas código.** Solo el `.md` de la spec.
- **En Supabase, solo `SELECT`.** El `insert` en `games` es un paso de la spec, no algo que se hace aquí.
- **No inventes constantes.** Cada valor de la tabla de reglas sale del código de referencia o de una respuesta del usuario. Si falta, pregunta.
- **No decidas el catálogo por el usuario.** Reutilizar o crear una fila nueva se pregunta siempre que haya un equivalente.
- **No toques el leaderboard.** Ya es genérico por `game_id`. La spec solo añade criterios de aceptación sobre él.
- **Una spec por juego.** Si el usuario pide varios, haz uno y propón ejecutar el skill otra vez para el siguiente.
- Si el usuario quiere saltarse las preguntas, recuérdale que ahorran horas después. Si insiste, anótalo en Decisiones ("Definición rápida sin aclaraciones detalladas").
