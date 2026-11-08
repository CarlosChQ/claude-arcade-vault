import type { Metadata } from "next";
import Link from "next/link";
import { HallOfFame } from "@/app/components/hall-of-fame";
import { getGames } from "@/app/data/games";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};

export default async function SalonPage() {
  const games = await getGames();

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <HallOfFame games={games} />

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
