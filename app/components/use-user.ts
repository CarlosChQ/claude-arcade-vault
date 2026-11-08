"use client";

import { useCallback, useSyncExternalStore } from "react";

// Sesión y puntuaciones mock en localStorage, con las mismas claves que la plantilla.
// Se sustituirá por autenticación y backend reales en specs futuras.

export type User = { name: string };
export type ScoreEntry = { game: string; score: number; name: string; at: number };

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";
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

/** Añade una puntuación a av_scores. Tolera fallos de localStorage. */
export function saveScore(entry: Omit<ScoreEntry, "at">): void {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    const all: ScoreEntry[] = Array.isArray(parsed) ? parsed : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage lleno, bloqueado o con datos corruptos: no se guarda.
  }
}
