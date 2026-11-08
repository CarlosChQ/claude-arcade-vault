import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GamePlayer } from "@/app/components/game-player";
import { getGame, getGames } from "@/app/data/games";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

// La lectura de `params` va dentro de <Suspense> para que el App Shell compartido
// de /games/[id]/jugar no dependa de la URL (partialPrefetching).
export default function GamePlayerPage(props: PageProps<"/games/[id]/jugar">) {
  return (
    <Suspense fallback={<GamePlayerSkeleton />}>
      <GamePlayerLoader params={props.params} />
    </Suspense>
  );
}

function GamePlayerSkeleton() {
  return (
    <div className="av-player" aria-busy="true">
      <div className="crt">
        <div className="crt-screen"></div>
      </div>
    </div>
  );
}

async function GamePlayerLoader({ params }: Pick<PageProps<"/games/[id]/jugar">, "params">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
