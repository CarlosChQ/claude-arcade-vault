// Motor de Asteroides: estado, bucle rAF y colisiones de game.js, encapsulados en una instancia.
// No hay globales de módulo mutables: dos montajes seguidos no comparten estado.
// El canvas no pinta HUD ni "GAME OVER": React recibe las estadísticas por onStats/onGameOver.

import type { CreateEngine, GameStats } from "../engine";
import {
  DEAD_TIME,
  H,
  MAX_DT,
  PARTICLES_PER_SIZE,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  SAFE_SPAWN_DIST,
  SHIP_COLLIDE_FACTOR,
  SHIP_EXPLOSION_PARTICLES,
  START_ASTEROIDS,
  START_LIVES,
  W,
} from "./constants";
import { Asteroid, Bullet, Particle, PowerUp, Ship, dist, rand } from "./entities";
import { createKeyboardInput } from "./input";
import { PALETTE, PHOSPHOR_DECAY, type NeonTone } from "./palette";

type State = "playing" | "dead" | "gameover";

const MAX_DPR = 2;

export const createAsteroidsEngine: CreateEngine = (canvas, events) => {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Asteroides: el navegador no ofrece un contexto 2D de canvas");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // Buffer escalado por devicePixelRatio; el CSS lo ajusta al 100 % de .crt-screen (4:3).
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const input = createKeyboardInput();

  // ── Estado de la partida (por instancia) ─────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let gameOverEmitted = false;
  let fullClear = true; // el próximo draw() borra del todo, sin estela

  // ── Estado del bucle ─────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null; // null → el próximo frame usa dt = 0
  let started = false;
  let paused = false;
  let stopped = false; // FIN: la partida deja de avanzar
  let destroyed = false;
  let lastStats: GameStats | null = null;

  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_SPAWN_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = START_LIVES;
    level = 1;
    state = "playing";
    deadTimer = 0;
    gameOverEmitted = false;
    fullClear = true;
    spawnAsteroids(START_ASTEROIDS);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count: number, color: NeonTone) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
  }

  function killShip() {
    explode(ship.x, ship.y, SHIP_EXPLOSION_PARTICLES, PALETTE.ship);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      input.setEnabled(false);
    } else {
      state = "dead";
      deadTimer = DEAD_TIME;
    }
  }

  function updateParticles(dt: number) {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  // ── Update ───────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      // Ya no espera Espacio: solo siguen animándose las partículas.
      updateParticles(dt);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (input.consumePress("Space")) bullets.push(...ship.tryShoot());

    ship.update(dt, {
      left: input.isDown("ArrowLeft"),
      right: input.isDown("ArrowRight"),
      thrust: input.isDown("ArrowUp"),
    });
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * PARTICLES_PER_SIZE, PALETTE.asteroid);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * SHIP_COLLIDE_FACTOR) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (state === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Draw (sin HUD ni overlay) ────────────────────────────────────────────
  function draw() {
    // Persistencia de fósforo: el negro tapa el frame anterior solo en parte (estela corta).
    // Una partida nueva parte de una pantalla limpia.
    ctx.save();
    ctx.globalAlpha = fullClear ? 1 : PHOSPHOR_DECAY;
    ctx.fillStyle = PALETTE.background;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    fullClear = false;
    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);
  }

  // ── Eventos hacia React ──────────────────────────────────────────────────
  function currentStats(): GameStats {
    const power = ship.tripleShot > 0 ? Math.round(ship.tripleShot * 10) / 10 : 0;
    return { score, lives, level, power: power > 0 ? power : null };
  }

  /** Emite onStats solo si algún campo cambió desde la última emisión. */
  function emitStats() {
    const s = currentStats();
    const prev = lastStats;
    if (
      prev &&
      prev.score === s.score &&
      prev.lives === s.lives &&
      prev.level === s.level &&
      prev.power === s.power
    ) {
      return;
    }
    lastStats = s;
    events.onStats(s);
  }

  function emitGameOver() {
    if (gameOverEmitted) return;
    gameOverEmitted = true;
    events.onGameOver(score);
  }

  // ── Bucle ────────────────────────────────────────────────────────────────
  function frame(ts: number) {
    rafId = null;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;

    update(dt);
    draw();
    emitStats();
    if (state === "gameover") emitGameOver();

    scheduleFrame();
  }

  function shouldRun() {
    return started && !paused && !stopped && !destroyed;
  }

  function scheduleFrame() {
    if (rafId === null && shouldRun()) rafId = requestAnimationFrame(frame);
  }

  function cancelFrame() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /** Listeners puestos solo mientras el bucle corre: un motor en pausa no deja nada en window. */
  function syncInput() {
    if (shouldRun()) {
      input.attach();
      input.setEnabled(state !== "gameover");
    } else {
      input.detach();
    }
  }

  initGame();

  return {
    start() {
      if (started || destroyed) return;
      started = true;
      syncInput();
      lastTime = null;
      emitStats();
      scheduleFrame();
    },

    pause() {
      if (paused || destroyed) return;
      paused = true;
      cancelFrame();
      syncInput();
    },

    resume() {
      if (!paused || destroyed) return;
      paused = false;
      lastTime = null; // primer frame tras reanudar con dt = 0: la nave no salta
      syncInput();
      scheduleFrame();
    },

    end() {
      if (destroyed) return;
      stopped = true;
      cancelFrame();
      state = "gameover";
      syncInput();
      emitStats();
      emitGameOver();
    },

    restart() {
      if (destroyed) return;
      cancelFrame();
      initGame();
      paused = false;
      stopped = false;
      lastTime = null;
      syncInput();
      draw();
      emitStats();
      scheduleFrame();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelFrame();
      input.detach();
    },
  };
};
