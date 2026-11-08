"use client";

import { useMemo, useState } from "react";
import { formatScore, seededScores, type Game } from "@/app/data/games";
import { useUser } from "./use-user";

export function HallOfFame({ games }: { games: Game[] }) {
  const { user } = useUser();
  const [tab, setTab] = useState(games[0].id);
  const rows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const game = games.find((g) => g.id === tab) ?? games[0];

  // Marca ficticia del usuario, con el mismo cálculo que la plantilla.
  const youRank = Math.floor(8 + (tab.length % 4));
  const youScore = (rows[5]?.score ?? 0) - 2400;

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
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1].name}</div>
          <div className="score">{formatScore(rows[1].score)}</div>
          <div className="date">{rows[1].date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel text-[9px] tracking-[0.18em] text-gold">
            CAMPEÓN
          </div>
          <div className="rank-num mt-1 text-[36px]">
            01
          </div>
          <div className="name">{rows[0].name}</div>
          <div className="score text-[20px]">
            {formatScore(rows[0].score)}
          </div>
          <div className="date">{rows[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2].name}</div>
          <div className="score">{formatScore(rows[2].score)}</div>
          <div className="date">{rows[2].date}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name + i}
            className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{formatScore(r.score)}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {user && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
              <div className="rk text-yellow">
                #{String(youRank).padStart(2, "0")}
              </div>
              <div className="pl text-yellow">
                {user.name}
              </div>
              <div className="sc text-yellow text-shadow-[0_0_6px_rgba(245,255,0,0.5)]">
                {formatScore(youScore || 9999)}
              </div>
              {/* Fecha fija aceptada en el MVP (ver Riesgos en la spec). */}
              <div className="dt">11/05/2026</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
