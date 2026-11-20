/**
 * Estado de pausa del cronómetro de una sesión activa.
 * Se persiste en localStorage por sesión para conservar el tiempo exacto al cambiar
 * de pantalla (p. ej. ver el detalle de un ejercicio y volver) o bloquear el móvil.
 */

export type TimerPauseState = {
  /** Timestamp (ms) en el que se pausó, o null si está corriendo. */
  pausedAt: number | null;
  /** Milisegundos acumulados en pausas anteriores. */
  pausedMs: number;
};

export const EMPTY_PAUSE: TimerPauseState = { pausedAt: null, pausedMs: 0 };

const KEY_PREFIX = "gym:pause:";

/** Segundos activos transcurridos descontando las pausas. */
export function computeElapsedSec(startedAtMs: number, nowMs: number, pause: TimerPauseState): number {
  const effectiveNow = pause.pausedAt ?? nowMs;
  const activeMs = effectiveNow - startedAtMs - pause.pausedMs;
  return Math.max(0, Math.floor(activeMs / 1000));
}

export function pauseTimer(pause: TimerPauseState, nowMs: number): TimerPauseState {
  if (pause.pausedAt !== null) return pause;
  return { pausedAt: nowMs, pausedMs: pause.pausedMs };
}

export function resumeTimer(pause: TimerPauseState, nowMs: number): TimerPauseState {
  if (pause.pausedAt === null) return pause;
  return { pausedAt: null, pausedMs: pause.pausedMs + Math.max(0, nowMs - pause.pausedAt) };
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function readPauseState(sessionId: number): TimerPauseState {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + sessionId);
    if (!raw) return EMPTY_PAUSE;
    const parsed = JSON.parse(raw) as Partial<TimerPauseState>;
    const pausedAt = typeof parsed.pausedAt === "number" && Number.isFinite(parsed.pausedAt) ? parsed.pausedAt : null;
    const pausedMs = typeof parsed.pausedMs === "number" && Number.isFinite(parsed.pausedMs) && parsed.pausedMs >= 0 ? parsed.pausedMs : 0;
    return { pausedAt, pausedMs };
  } catch {
    return EMPTY_PAUSE;
  }
}

export function writePauseState(sessionId: number, state: TimerPauseState) {
  try {
    localStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(state));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export function clearPauseState(sessionId: number) {
  try {
    localStorage.removeItem(KEY_PREFIX + sessionId);
  } catch {
    /* nada */
  }
}
