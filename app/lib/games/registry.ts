import { createAsteroidsEngine } from "./asteroids";
import type { CreateEngine } from "./engine";

// Motores reales por id de juego. Los juegos sin entrada usan la simulación decorativa.
export const ENGINES: Partial<Record<string, CreateEngine>> = {
  asteroides: createAsteroidsEngine,
};
