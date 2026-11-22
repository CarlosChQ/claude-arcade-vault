// Cliente de Supabase sin cookies ni sesión (SPEC 06), para lecturas públicas
// dentro de "use cache". cookies() no se puede usar en un ámbito cacheado, y
// estos datos (catálogo, rankings) no dependen del usuario.
// Crea un cliente nuevo en cada llamada; nunca en el ámbito del módulo.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export function createPublicClient(): SupabaseClient<Database> {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
