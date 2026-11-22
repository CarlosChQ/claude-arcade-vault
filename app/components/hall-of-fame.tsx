"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatScore, type Game } from "@/app/data/games";
import { NAME_RE, normalizeName, toLeaderboardRow, type LeaderboardRow } from "@/app/lib/scores";
import { createClient } from "@/app/lib/supabase/client";
import { useUser } from "./use-user";

// Ranking real del Salón (SPEC 06): `boards` llega del servidor con el top 12
// de cada juego (getLeaderboards, cacheado con el tag "scores").

const PODIUM = [
  { index: 1, className: "silver" },
  { index: 0, className: "gold" },
  { index: 2, className: "bronze" },
] as const;

// Mejor marca de la sesión mock (av_user) en un juego. Se consulta en el
// navegador porque el usuario solo existe en localStorage. Devuelve null si no
// hay fila, si el nombre no es válido o si la consulta falla.
async function fetchMyBest(gameId: string, name: string): Promise<LeaderboardRow | null> {
  try {
    const { data, error } = await createClient()
      .from("leaderboard")
      .select("game_id, name, score, created_at, rank")
      .eq("game_id", gameId)
      .eq("name", name)
      .maybeSingle();
    if (error || !data) return null;
    return toLeaderboardRow(data);
  } catch {
    return null;
  }
}

export function HallOfFame({
  games,
  boards,
}: {
  games: Game[];
  boards: Record<string, LeaderboardRow[]>;
}) {
  const { user } = useUser();
  const [tab, setTab] = useState(games[0].id);
  const rows = boards[tab] ?? [];
  const game = games.find((g) => g.id === tab) ?? games[0];

  const myName = user ? normalizeName(user.name) : null;
  const myKey = myName && NAME_RE.test(myName) ? `${tab}:${myName}` : null;

  // El resultado se guarda con su clave (juego + nombre): al cambiar de pestaña
  // o de sesión, la marca anterior deja de mostrarse sin esperar a la consulta.
  // `boards` está en las dependencias para volver a consultar cuando el servidor
  // envía un ranking nuevo (tras guardar, updateTag("scores")).
  const [mine, setMine] = useState<{ key: string; row: LeaderboardRow | null } | null>(null);
  useEffect(() => {
    if (!myKey || !myName) return;
    let active = true;
    fetchMyBest(tab, myName).then((row) => {
      if (active) setMine({ key: myKey, row });
    });
    return () => {
      active = false;
    };
  }, [tab, myName, myKey, boards]);

  const myBest = mine && mine.key === myKey ? mine.row : null;

  return (
    <>
      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        {PODIUM.map(({ index, className }) => {
          const r = rows[index];
          const gold = index === 0;
          return (
            <div key={className} className={`podium-slot ${className}` + (r ? "" : " vacant")}>
              {gold && (
                <div className="pixel text-[9px] tracking-[0.18em] text-gold">
                  CAMPEÓN
                </div>
              )}
              <div className={"rank-num" + (gold ? " mt-1 text-[36px]" : "")}>
                {String(index + 1).padStart(2, "0")}
              </div>
              {/* Un puesto sin dueño mantiene la altura del podio: mismas tres líneas. */}
              <div className="name">{r ? r.name : "LIBRE"}</div>
              <div className={"score" + (gold ? " text-[20px]" : "")}>
                {r ? formatScore(r.score) : "—"}
              </div>
              <div className="date">{r ? r.date : "\u00a0"}</div>
            </div>
          );
        })}
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 && (
          <div className="hall-empty">
            <h2>
              SIN MARCAS TODAVÍA<span className="caret" aria-hidden="true">_</span>
            </h2>
            <p>
              Nadie ha guardado una puntuación en {game.title}. La primera que guardes se queda
              con el oro.
            </p>
            <Link href={`/games/${game.id}/jugar`} className="btn yellow">
              JUGAR A {game.title}
            </Link>
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{formatScore(r.score)}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {myBest && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
              <div className="rk text-yellow">
                #{String(myBest.rank).padStart(2, "0")}
              </div>
              <div className="pl text-yellow">
                {myBest.name}
              </div>
              <div className="sc text-yellow text-shadow-[0_0_6px_rgba(245,255,0,0.5)]">
                {formatScore(myBest.score)}
              </div>
              <div className="dt">{myBest.date}</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
