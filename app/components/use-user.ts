"use client";

import { useCallback, useSyncExternalStore } from "react";

// Sesión mock en localStorage, con la misma clave que la plantilla.
// Se sustituirá por autenticación real en specs futuras. Las puntuaciones se
// guardan en Supabase (SPEC 06, submitScore).

export type User = { name: string };

const USER_KEY = "av_user";
const USER_EVENT = "av-user-change";

// Caché del snapshot: useSyncExternalStore exige devolver la misma referencia
// mientras el valor no cambie.
let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): User | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      cachedUser =
        parsed && typeof parsed === "object" && typeof (parsed as User).name === "string"
          ? { name: (parsed as User).name }
          : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

function getServerSnapshot(): User | null {
  return null;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === USER_KEY) onChange();
  };
  window.addEventListener(USER_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(USER_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function notify() {
  window.dispatchEvent(new Event(USER_EVENT));
}

export function useUser() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = useCallback((next: User) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      // localStorage no disponible: la sesión mock simplemente no persiste.
    }
    notify();
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignorado: ver login().
    }
    notify();
  }, []);

  return { user, login, logout };
}
