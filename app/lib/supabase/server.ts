// Cliente de Supabase para el servidor (SPEC 04): Server Components, Server
// Actions y Route Handlers. Crea un cliente nuevo en cada llamada; nunca se
// comparte entre peticiones ni se crea en el ámbito del módulo.

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies. Dejará de importar
          // cuando el proxy.ts de la spec de auth refresque la sesión.
        }
      },
    },
  });
}
