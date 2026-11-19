// GET /api/health/supabase (SPEC 04): comprueba que la URL y la publishable
// key de Supabase responden. El cuerpo nunca incluye la URL, la clave ni el
// mensaje del error; los detalles solo van a la consola del servidor.

import { connection } from "next/server";

import { getSupabaseEnv } from "@/app/lib/supabase/env";

type HealthBody = { ok: true } | { ok: false; error: "config" | "connection" };

function reply(body: HealthBody, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(): Promise<Response> {
  // Con cacheComponents, sin esto la ruta se prerenderizaría en la build y la
  // salud quedaría congelada.
  await connection();

  const env = getSupabaseEnv();
  if (!env) {
    console.error("[supabase-health]", "faltan variables de entorno");
    return reply({ ok: false, error: "config" }, 503);
  }

  try {
    // /auth/v1/health valida la clave y no depende de que existan tablas.
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error("[supabase-health]", `respuesta HTTP ${res.status}`);
      return reply({ ok: false, error: "connection" }, 503);
    }

    return reply({ ok: true }, 200);
  } catch (err) {
    console.error("[supabase-health]", err instanceof Error ? err.message : err);
    return reply({ ok: false, error: "connection" }, 503);
  }
}
