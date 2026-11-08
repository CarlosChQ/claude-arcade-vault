import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatScore, getGame, getGames, seededScores } from "@/app/data/games";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

// Con partialPrefetching, el App Shell se comparte entre todos los /games/[id],
// así que la lectura de `params` va dentro de <Suspense> y el shell lleva solo el esqueleto.
export default function GameDetailPage(props: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<GameDetailSkeleton />}>
      <GameDetail params={props.params} />
    </Suspense>
  );
}

function GameDetailSkeleton() {
  return (
    <div className="av-detail" aria-busy="true">
      <div>
        <div className="detail-cover"></div>
      </div>
      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
        </div>
      </aside>
    </div>
  );
}

async function GameDetail({ params }: Pick<PageProps<"/games/[id]">, "params">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const scores = seededScores(id.length * 17 + 3, 10);

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div className="detail-info mt-5">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v text-magenta text-shadow-[0_0_6px_rgba(255,0,110,0.5)]">
                {formatScore(game.best)}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v text-yellow text-shadow-[0_0_6px_rgba(245,255,0,0.5)]">
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.map((r, i) => (
            <div
              key={r.name}
              className={"lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div className="text-[10px] tracking-[0.1em] text-ink-faint">{r.date}</div>
              </div>
              <div className="sc">{formatScore(r.score)}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
