// Catálogo de Arcade Vault (SPEC 06): los juegos viven en la tabla `games` de
// Supabase. Aquí quedan los tipos, las utilidades de formato y los datos
// ficticios que siguen usando la ficha y la home (PLAYERS, seededScores).

import { cacheLife, cacheTag } from "next/cache";

import type { Database } from "@/app/lib/supabase/database.types";
import { createPublicClient } from "@/app/lib/supabase/public";

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string; // slug usado en la URL: "bloque-buster", "caida", ...
  title: string;
  short: string; // descripción de tarjeta
  long: string; // descripción de detalle
  cat: Category;
  cover: string; // clase CSS de portada: "cover-bricks", "cover-tetro", ...
  color: AccentColor;
  best: number;
  plays: string; // "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/2026"

export const CATS: ("TODOS" | Category)[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

export const PLAYERS: string[] = [
  "PX_KAI", "NEONFOX", "Z3R0COOL", "M00NRYU", "VAULT_07", "GLITCHA",
  "ATARI_KID", "CYBER_LU", "MAGENTA88", "SCANLINE", "BIT_LORD", "ARKADYA",
  "DROID_X", "RGB_QUEEN", "PIXEL_DAD", "RETROVIRA", "VECTORX", "JOY_STK",
];

/** Genera un ranking determinista (mismo LCG que la plantilla). */
export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);
    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({ rank: i + 1, name, score: Math.max(score, 1000), date: `${day}/${mon}/2026` });
  }
  return rows.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}

const scoreFormatter = new Intl.NumberFormat("es-ES");

/** Única fuente de formato de puntuaciones: 28450 → "28.450". */
export function formatScore(n: number): string {
  return scoreFormatter.format(n);
}

type GameRow = Database["public"]["Tables"]["games"]["Row"];

// Los CHECK de la tabla garantizan los valores de `cat` y `color`.
function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.summary,
    long: row.description,
    cat: row.cat as Category,
    cover: row.cover,
    color: row.color as AccentColor,
    best: row.best,
    plays: row.plays,
  };
}

export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheTag("games");
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("games")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("[games] No se pudo leer el catálogo", { cause: error });
  }

  return data.map(toGame);
}

// Busca en el catálogo cacheado: no hace una consulta aparte.
export async function getGame(id: string): Promise<Game | undefined> {
  const games = await getGames();
  return games.find((g) => g.id === id);
}
