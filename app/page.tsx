import Link from "next/link";

// Placeholder temporal (SPEC 02, paso 2): la Home real llega en el paso 9.
export default function Home() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          <Link href="/games" className="btn">
            IR A LA BIBLIOTECA →
          </Link>
        </div>
      </section>
    </div>
  );
}
