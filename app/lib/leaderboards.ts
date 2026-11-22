// Lectura del ranking desde la vista `leaderboard` de Supabase (SPEC 06).
// Solo servidor: usa "use cache" y next/cache, que no pueden entrar en el
// bundle del navegador. Las reglas y tipos están en ./scores.

import { cacheTag } from "next/cache";

import { getGames } from "@/app/data/catalog";
import { createPublicClient } from "@/app/lib/supabase/public";

import { toLeaderboardRow, type LeaderboardRow } from "./scores";

const TOP = 12;

// Top 12 de cada juego, indexado por game_id. Los juegos sin marcas llevan [].
// Se invalida con updateTag("scores") desde submitScore.
export async function getLeaderboards(): Promise<Record<string, LeaderboardRow[]>> {
  "use cache";
  cacheTag("scores");

  const [games, { data, error }] = await Promise.all([
    getGames(),
    createPublicClient()
      .from("leaderboard")
      .select("game_id, name, score, created_at, rank")
      .lte("rank", TOP)
      .order("game_id", { ascending: true })
      .order("rank", { ascending: true }),
  ]);

  if (error) {
    throw new Error("[scores] No se pudo leer el ranking", { cause: error });
  }

  const boards: Record<string, LeaderboardRow[]> = Object.fromEntries(
    games.map((g) => [g.id, []]),
  );

  for (const row of data) {
    const entry = toLeaderboardRow(row);
    if (entry && row.game_id && boards[row.game_id]) boards[row.game_id].push(entry);
  }

  return boards;
}
