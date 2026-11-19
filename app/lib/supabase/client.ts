// Cliente de Supabase para Client Components (SPEC 04).
// Sin "use client": es un módulo, no un componente. El cliente se crea al
// llamar a la función, nunca en el ámbito del módulo, para que next build
// funcione sin variables.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export function createClient(): SupabaseClient<Database> {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createBrowserClient<Database>(env.url, env.publishableKey);
}
