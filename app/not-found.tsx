import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-in flex flex-col items-center px-4 pt-24 pb-20 text-center">
      <div className="pixel neon-magenta flicker text-[clamp(28px,7vw,56px)]">GAME OVER</div>
      <div className="pixel neon-cyan mt-5 text-[clamp(14px,3vw,22px)] tracking-[0.3em]">· 404 ·</div>
      <p className="mono mt-8 max-w-md text-sm text-ink-dim">
        Este cartucho no está en el vault. Puede que el enlace esté roto o que el juego aún no exista.
      </p>
      <Link href="/" className="btn lg pulse mt-10">
        VOLVER A LA BIBLIOTECA
      </Link>
      <div className="pixel mt-6 text-[9px] tracking-[0.16em] text-ink-faint">
        INSERTA UNA MONEDA PARA CONTINUAR <span className="animate-[blink_1.2s_steps(1,end)_infinite]">_</span>
      </div>
    </div>
  );
}
