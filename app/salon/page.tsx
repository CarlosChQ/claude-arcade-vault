import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { HallOfFame } from "@/app/components/hall-of-fame";
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
export default function SalonPage() {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <Suspense fallback={<HallOfFameSkeleton />}>
        <HallOfFameLoader />
      </Suspense>

      <div className="mt-8 text-center">
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

async function HallOfFameLoader() {
  await connection();
  const [games, boards] = await Promise.all([getGames(), getLeaderboards()]);
  return <HallOfFame games={games} boards={boards} />;
}

// Esqueleto provisional: su diseño se resuelve en el paso 9 de la SPEC 06.
function HallOfFameSkeleton() {
  return (
    <div aria-busy="true">
      <div className="podium">
        <div className="podium-slot silver"></div>
        <div className="podium-slot gold"></div>
        <div className="podium-slot bronze"></div>
      </div>
      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
      </div>
    </div>
  );
}
