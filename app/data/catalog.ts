// Lectura del catálogo desde la tabla `games` de Supabase (SPEC 06).
// Solo servidor: usa "use cache" y next/cache, que no pueden entrar en el
// bundle del navegador. Los tipos y utilidades están en ./games.

import { cacheLife, cacheTag } from "next/cache";

import type { Database } from "@/app/lib/supabase/database.types";
import { createPublicClient } from "@/app/lib/supabase/public";

import type { AccentColor, Category, Game } from "./games";

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
