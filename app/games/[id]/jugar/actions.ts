"use server";

import { updateTag } from "next/cache";

import { getGames } from "@/app/data/catalog";
import { MAX_SCORE, NAME_RE, normalizeName } from "@/app/lib/scores";
import { createClient } from "@/app/lib/supabase/server";

export type SubmitScoreResult = { ok: true } | { ok: false; error: "invalid" | "server" };

// Server Action del modal "FIN DEL JUEGO" (SPEC 06). Valida en el servidor,
// inserta en `scores` e invalida el ranking cacheado del Salón. Los CHECK de la
// tabla repiten esta validación, porque la publishable key permite insertar
// sin pasar por aquí. La respuesta nunca incluye el mensaje de Supabase.
export async function submitScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SubmitScoreResult> {
  // 1. Validación (el servidor no se fía del cliente).
  const name = typeof input.name === "string" ? normalizeName(input.name) : "";
  if (!NAME_RE.test(name)) {
    console.error("[scores] Nombre no válido");
    return { ok: false, error: "invalid" };
  }

  const { score, gameId } = input;
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    console.error("[scores] Puntuación no válida");
    return { ok: false, error: "invalid" };
  }

  try {
    const games = await getGames();
    if (!games.some((g) => g.id === gameId)) {
      console.error("[scores] Juego desconocido");
      return { ok: false, error: "invalid" };
    }

    // 2. Inserción.
    const supabase = await createClient();
    const { error } = await supabase.from("scores").insert({ game_id: gameId, name, score });
    if (error) {
      console.error("[scores]", error.message);
      return { ok: false, error: "server" };
    }
  } catch (error) {
    console.error("[scores]", error);
    return { ok: false, error: "server" };
  }

  // 3. El Salón muestra la nueva marca en la siguiente lectura.
  updateTag("scores");
  return { ok: true };
}
