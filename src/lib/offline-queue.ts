/**
 * Cola local (localStorage) para el entreno sin cobertura.
 * Guarda las series pendientes de enviar y la orden de "terminar" hasta tener red.
 */
import type { Intensity } from "./kcal";

export type QueuedSet = { reps: number; weightKg: number; type?: string; completed?: boolean };
export type QueuedFinish = {
  durationMin: number;
  intensity: Intensity;
  notes?: string;
  updateRoutine?: boolean;
  routineAction?: "update" | "new";
  newRoutineName?: string;
};

const SETS = "gym:sets:";
const FINISH = "gym:finish:";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno o bloqueado: se pierde solo la copia local */
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nada */
  }
}

export const pendingSets = (seId: number) => read<QueuedSet[]>(SETS + seId);
export const queueSets = (seId: number, sets: QueuedSet[]) => write(SETS + seId, sets);
export const clearSets = (seId: number) => remove(SETS + seId);

export const pendingFinish = (sessionId: number) => read<QueuedFinish>(FINISH + sessionId);
export const queueFinish = (sessionId: number, v: QueuedFinish) => write(FINISH + sessionId, v);
export const clearFinish = (sessionId: number) => remove(FINISH + sessionId);

/** Ids de ejercicios de sesión con series pendientes. */
export function pendingSetIds(): number[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(SETS))
      .map((k) => Number(k.slice(SETS.length)))
      .filter(Number.isInteger);
  } catch {
    return [];
  }
}
