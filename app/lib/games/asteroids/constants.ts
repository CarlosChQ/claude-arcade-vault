// Constantes de Asteroides, portadas tal cual de references/started-games/02-asteroids/game.js.
// Unidades: píxeles lógicos (lienzo 800×600) y segundos.

// ── Lienzo y bucle ───────────────────────────────────────────────────────────
export const W = 800;
export const H = 600;
export const MAX_DT = 0.05; // dt máximo por frame (50 ms)

// ── Partida ──────────────────────────────────────────────────────────────────
export const START_LIVES = 3;
export const START_ASTEROIDS = 4; // nivel 1; los siguientes usan 3 + nivel
export const DEAD_TIME = 2; // segundos entre perder una vida y reaparecer
export const SAFE_SPAWN_DIST = 130; // distancia mínima al centro al generar asteroides

// ── Asteroides (índice = tamaño: 1 pequeño, 2 mediano, 3 grande) ────────────
export type AsteroidSize = 1 | 2 | 3;
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;
export const ASTEROID_SPEED_JITTER = 15;
export const ASTEROID_MAX_ROT_SPEED = 1.2; // rad/s
export const ASTEROID_MIN_VERTS = 8;
export const ASTEROID_MAX_VERTS = 13;
export const ASTEROID_MIN_VERT_SCALE = 0.6;
export const PARTICLES_PER_SIZE = 5; // partículas por explosión = tamaño × 5

// ── Nave ─────────────────────────────────────────────────────────────────────
export const SHIP_RADIUS = 12;
export const SHIP_ROT_SPEED = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987; // por frame, como en el original
export const SHIP_INVINCIBLE_TIME = 3;
export const SHIP_NOSE = 21; // distancia del centro a la boca del cañón
export const SHIP_COLLIDE_FACTOR = 0.82; // ajuste de colisión nave/asteroide
export const SHIP_EXPLOSION_PARTICLES = 14;
export const FIRE_COOLDOWN = 0.2;

// ── Balas ────────────────────────────────────────────────────────────────────
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const BULLET_RADIUS = 2;

// ── Power-up disparo triple ──────────────────────────────────────────────────
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_GUARANTEED_KILLS = 5;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const POWERUP_RADIUS = 12;
export const POWERUP_MIN_SPEED = 20;
export const POWERUP_MAX_SPEED = 40;
export const TRIPLE_SPREAD = 0.18; // rad entre balas del abanico

// ── Partículas ───────────────────────────────────────────────────────────────
export const PARTICLE_MIN_SPEED = 30;
export const PARTICLE_MAX_SPEED = 130;
export const PARTICLE_MIN_LIFE = 0.4;
export const PARTICLE_MAX_LIFE = 1.1;
