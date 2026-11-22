// Reglas de puntuaciones (SPEC 06): normalización, validación y forma de las
// filas del ranking. Sin dependencias de servidor: lo usan la Server Action,
// getLeaderboards() (./leaderboards.ts) y el navegador (HallOfFame).
// La validación que no se puede saltar son los CHECK de la tabla `scores`.

import type { Database } from "@/app/lib/supabase/database.types";

export const NAME_RE = /^[A-Z0-9_]{1,12}$/;
export const MAX_SCORE = 9_999_999;

// trim + toUpperCase + recorte a 12 caracteres. Se valida después con NAME_RE.
export function normalizeName(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 12);
}

export type LeaderboardRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/YYYY"

type LeaderboardViewRow = Database["public"]["Views"]["leaderboard"]["Row"];

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Las columnas de una vista llegan como nullable en los tipos generados,
// aunque la vista nunca las devuelve nulas. Una fila incompleta se descarta.
export function toLeaderboardRow(row: LeaderboardViewRow): LeaderboardRow | null {
  if (row.rank === null || row.name === null || row.score === null || row.created_at === null) {
    return null;
  }
  return {
    rank: row.rank,
    name: row.name,
    score: row.score,
    date: dateFormatter.format(new Date(row.created_at)),
  };
}
