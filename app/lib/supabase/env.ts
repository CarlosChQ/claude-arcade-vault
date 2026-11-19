// Variables públicas de Supabase (SPEC 04).
// Sin "use server" ni "use client": la usan el cliente de servidor, el de
// navegador y la ruta /api/health/supabase.

export type SupabaseEnv = { url: string; publishableKey: string };

// Devuelve null si falta alguna variable. No lanza: quien la llama decide.
export function getSupabaseEnv(): SupabaseEnv | null {
  // Acceso literal, sin desestructurar process.env: así Next.js puede insertar
  // los valores NEXT_PUBLIC_* en el bundle del navegador durante la build.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}
