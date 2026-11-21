"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExerciseLite } from "./data";

const STORAGE_KEY = "gym-planner:exercises-catalog:v1";
const REVALIDATE_TTL_MS = 30_000;

type StoredCatalog = {
  etag?: string;
  data: ExerciseLite[];
};

let memoryCache: ExerciseLite[] | null = null;
let lastFetchedAt = 0;
let inflight: Promise<ExerciseLite[]> | null = null;

function readStorage(): StoredCatalog | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCatalog | ExerciseLite[];
    if (Array.isArray(parsed)) return { data: parsed };
    if (parsed && Array.isArray(parsed.data)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeStorage(entry: StoredCatalog) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Silenciar errores de cuota o modo privado
  }
}

function getCachedSnapshot(): ExerciseLite[] | null {
  if (memoryCache) return memoryCache;
  const stored = readStorage();
  if (stored) {
    memoryCache = stored.data;
    return memoryCache;
  }
  return null;
}

/** Pre-calienta la caché del navegador cuando el catálogo ya llegó por RSC. */
export function seedExerciseCatalogCache(data: ExerciseLite[]) {
  memoryCache = data;
  lastFetchedAt = Date.now();
  const prev = readStorage();
  writeStorage({ etag: prev?.etag, data });
}

export async function fetchExerciseCatalog(force = false): Promise<ExerciseLite[]> {
  if (!force && memoryCache && Date.now() - lastFetchedAt < REVALIDATE_TTL_MS) {
    return memoryCache;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const stored = readStorage();
    const headers: HeadersInit = {};
    if (stored?.etag) {
      headers["If-None-Match"] = stored.etag;
    }

    const res = await fetch("/api/exercises", {
      credentials: "same-origin",
      headers,
    });

    if (res.status === 304 && stored?.data) {
      memoryCache = stored.data;
      lastFetchedAt = Date.now();
      return stored.data;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as ExerciseLite[];
    const etag = res.headers.get("ETag") ?? undefined;
    memoryCache = data;
    lastFetchedAt = Date.now();
    writeStorage({ etag, data });
    return data;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function useExerciseCatalog(provided?: ExerciseLite[]) {
  const [exercises, setExercises] = useState<ExerciseLite[]>(() => provided ?? getCachedSnapshot() ?? []);
  const [loading, setLoading] = useState(() => !provided && getCachedSnapshot() === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (provided) return;
    let active = true;
    const hasCached = getCachedSnapshot() !== null;
    fetchExerciseCatalog(false)
      .then((fresh) => {
        if (!active) return;
        setExercises(fresh);
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        if (!hasCached) setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [provided]);

  const retry = useCallback(() => {
    const hasCached = getCachedSnapshot() !== null;
    if (!hasCached) setLoading(true);
    setError(false);
    fetchExerciseCatalog(true)
      .then((fresh) => {
        setExercises(fresh);
        setLoading(false);
      })
      .catch(() => {
        if (!hasCached) setError(true);
        setLoading(false);
      });
  }, []);

  return {
    exercises: provided ?? exercises,
    loading: provided ? false : loading,
    error: provided ? false : error,
    retry,
  };
}
