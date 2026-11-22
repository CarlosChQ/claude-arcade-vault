import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { HallOfFame } from "@/app/components/hall-of-fame";
import type { Game } from "@/app/data/games";
import { getGames } from "@/app/data/catalog";
import { getLeaderboards } from "@/app/lib/leaderboards";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};

// La cabecera y los enlaces forman el App Shell estático. El ranking va dentro
// de <Suspense> y se renderiza en cada petición: si fuera parte del prerender,
// tras updateTag("scores") la navegación recibiría la página estática antigua
// hasta que se regenerase. Los datos siguen saliendo de la caché de
// getLeaderboards() ("use cache"), no de una consulta a Supabase por visita.
export default async function SalonPage() {
  // Catálogo cacheado ("use cache"): forma parte del App Shell, así el esqueleto
  // muestra las pestañas reales y nada salta de sitio al llegar el ranking.
  const games = await getGames();

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <Suspense fallback={<HallOfFameSkeleton games={games} />}>
        <HallOfFameLoader games={games} />
      </Suspense>

      <div className="mt-8 text-center">
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

async function HallOfFameLoader({ games }: { games: Game[] }) {
  await connection();
  const boards = await getLeaderboards();
  return <HallOfFame games={games} boards={boards} />;
}

// Esqueleto: misma estructura que HallOfFame (pestañas, podio, tabla) para que
// el ranking real ocupe el mismo sitio al llegar.
function HallOfFameSkeleton({ games }: { games: Game[] }) {
  return (
    <div aria-busy="true" aria-label="Cargando el Salón de la Fama">
      <div className="hall-tabs">
        {games.map((g, i) => (
          <button key={g.id} type="button" className={"chip" + (i === 0 ? " active" : "")} disabled>
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        {(["silver", "gold", "bronze"] as const).map((metal, i) => {
          const gold = metal === "gold";
          return (
            <div key={metal} className={`podium-slot ${metal} vacant`}>
              {gold && (
                <div className="pixel text-[9px] tracking-[0.18em] text-gold">
                  CAMPEÓN
                </div>
              )}
              <div className={"rank-num" + (gold ? " mt-1 text-[36px]" : "")}>
                {String([2, 1, 3][i]).padStart(2, "0")}
              </div>
              <span className="sk-bar"></span>
              <span className="sk-bar w-[40%]"></span>
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
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="tr sk">
            <span className="sk-bar"></span>
            <span className="sk-bar"></span>
            <span className="sk-bar"></span>
            <span className="sk-bar"></span>
          </div>
        ))}
      </div>
    </div>
  );
}
