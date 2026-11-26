/**
 * Puente sin dependencias hacia el plugin nativo Android (Capacitor: RestTimer)
 * + persistencia en localStorage del descanso en curso + sonido Web Audio de respaldo.
 *
 * En navegador/PWA normal todas las llamadas nativas son no-op seguras.
 */

export type NativeRestAction = "add15" | "skip" | "finished";

export type NativeRestActionEvent = {
  action: NativeRestAction;
  endAtMs: number;
  totalSec: number;
  sessionId: number;
};

export type NativeRestState = {
  active: boolean;
  paused: boolean;
  endAtMs: number;
  pausedLeftMs: number;
  totalSec: number;
  exerciseName: string;
  setLabel: string;
  sessionId: number;
  lastAction: string;
  lastActionAtMs: number;
};

export type NativeRestPermissions = {
  overlay: boolean;
  notifications: boolean;
  batteryUnrestricted: boolean;
  exactAlarm: boolean;
  sdkInt: number;
};

export type NativeRestPreferences = {
  overlayEnabled: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  soundInSilentMode: boolean;
  minSeconds: number;
};

export type StartNativeRestOptions = {
  endAtMs: number;
  totalSec: number;
  exerciseName: string;
  setLabel: string;
  sessionId: number;
  sessionUrl?: string;
  forceOverlay?: boolean;
};

export type PersistedRestTimer = {
  endAtMs: number | null;
  pausedLeftMs: number | null;
  totalSec: number;
  exerciseName: string;
  setNumber: number;
  totalSets: number;
};

type PluginListenerHandle = { remove: () => Promise<void> | void };

type RestTimerPluginInterface = {
  start(options: StartNativeRestOptions): Promise<{ started: boolean; reason?: string }>;
  update(options: { endAtMs: number; totalSec: number }): Promise<void>;
  pause(options: { pausedLeftMs: number; totalSec: number }): Promise<void>;
  resume(options: { endAtMs: number; totalSec: number }): Promise<void>;
  stop(): Promise<void>;
  getState(): Promise<NativeRestState>;
  getPermissions(): Promise<NativeRestPermissions>;
  requestOverlayPermission(): Promise<NativeRestPermissions>;
  requestNotificationPermission(): Promise<NativeRestPermissions>;
  requestBatteryOptimization(): Promise<NativeRestPermissions>;
  getPreferences(): Promise<NativeRestPreferences>;
  setPreferences(prefs: Partial<NativeRestPreferences>): Promise<NativeRestPreferences>;
  resetPillPosition(): Promise<void>;
  addListener(
    eventName: "timerAction",
    listener: (event: NativeRestActionEvent) => void,
  ): Promise<PluginListenerHandle> | PluginListenerHandle;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: {
      RestTimer?: RestTimerPluginInterface;
    };
  };
};

const REST_KEY_PREFIX = "gym:rest:";

function getPlugin(): RestTimerPluginInterface | null {
  if (typeof window === "undefined") return null;
  const cap = (window as CapacitorWindow).Capacitor;
  if (!cap) return null;
  if (typeof cap.isNativePlatform === "function" && !cap.isNativePlatform()) return null;
  return cap.Plugins?.RestTimer ?? null;
}

export function isNativeRestTimerAvailable(): boolean {
  return getPlugin() !== null;
}

export async function startNativeRestTimer(options: StartNativeRestOptions): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    const res = await plugin.start(options);
    return Boolean(res?.started);
  } catch {
    return false;
  }
}

export async function updateNativeRestTimer(endAtMs: number, totalSec: number): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.update({ endAtMs, totalSec });
  } catch {}
}

export async function pauseNativeRestTimer(pausedLeftMs: number, totalSec: number): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.pause({ pausedLeftMs, totalSec });
  } catch {}
}

export async function resumeNativeRestTimer(endAtMs: number, totalSec: number): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.resume({ endAtMs, totalSec });
  } catch {}
}

export async function stopNativeRestTimer(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.stop();
  } catch {}
}

export async function getNativeRestState(): Promise<NativeRestState | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.getState();
  } catch {
    return null;
  }
}

export function subscribeNativeRestActions(listener: (event: NativeRestActionEvent) => void): () => void {
  const plugin = getPlugin();
  if (!plugin) return () => {};
  let disposed = false;
  let handle: PluginListenerHandle | null = null;

  try {
    const maybePromise = plugin.addListener("timerAction", (ev) => {
      if (!disposed) listener(ev);
    });
    if (maybePromise && typeof (maybePromise as Promise<PluginListenerHandle>).then === "function") {
      (maybePromise as Promise<PluginListenerHandle>)
        .then((h) => {
          if (disposed) {
            void h.remove();
          } else {
            handle = h;
          }
        })
        .catch(() => {});
    } else {
      handle = maybePromise as PluginListenerHandle;
    }
  } catch {}

  return () => {
    disposed = true;
    try {
      void handle?.remove();
    } catch {}
  };
}

export async function getNativeRestPermissions(): Promise<NativeRestPermissions | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.getPermissions();
  } catch {
    return null;
  }
}

export async function requestNativeOverlayPermission(): Promise<NativeRestPermissions | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.requestOverlayPermission();
  } catch {
    return null;
  }
}

export async function requestNativeNotificationPermission(): Promise<NativeRestPermissions | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.requestNotificationPermission();
  } catch {
    return null;
  }
}

export async function requestNativeBatteryOptimization(): Promise<NativeRestPermissions | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.requestBatteryOptimization();
  } catch {
    return null;
  }
}

export async function getNativeRestPreferences(): Promise<NativeRestPreferences | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.getPreferences();
  } catch {
    return null;
  }
}

export async function setNativeRestPreferences(
  prefs: Partial<NativeRestPreferences>,
): Promise<NativeRestPreferences | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.setPreferences(prefs);
  } catch {
    return null;
  }
}

export async function resetNativePillPosition(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.resetPillPosition();
  } catch {}
}

/**
 * Persiste el descanso activo en localStorage para que volver desde YouTube o Google
 * (incluso si el WebView recarga) nunca pierda la cuenta atrás.
 */
export function readRestTimerState(sessionId: number, nowMs = Date.now()): PersistedRestTimer | null {
  try {
    const raw = localStorage.getItem(REST_KEY_PREFIX + sessionId);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PersistedRestTimer>;
    const endAtMs = typeof p.endAtMs === "number" && Number.isFinite(p.endAtMs) ? p.endAtMs : null;
    const pausedLeftMs =
      typeof p.pausedLeftMs === "number" && Number.isFinite(p.pausedLeftMs) && p.pausedLeftMs > 0
        ? p.pausedLeftMs
        : null;
    const totalSec = typeof p.totalSec === "number" && Number.isFinite(p.totalSec) && p.totalSec > 0 ? p.totalSec : 0;

    if (pausedLeftMs === null && (endAtMs === null || endAtMs <= nowMs)) {
      localStorage.removeItem(REST_KEY_PREFIX + sessionId);
      return null;
    }

    return {
      endAtMs: pausedLeftMs !== null ? null : endAtMs,
      pausedLeftMs,
      totalSec: totalSec || Math.max(1, Math.ceil(((pausedLeftMs ?? (endAtMs! - nowMs)) || 1000) / 1000)),
      exerciseName: typeof p.exerciseName === "string" ? p.exerciseName : "",
      setNumber: typeof p.setNumber === "number" && Number.isFinite(p.setNumber) ? p.setNumber : 0,
      totalSets: typeof p.totalSets === "number" && Number.isFinite(p.totalSets) ? p.totalSets : 0,
    };
  } catch {
    return null;
  }
}

export function writeRestTimerState(sessionId: number, state: PersistedRestTimer) {
  try {
    localStorage.setItem(REST_KEY_PREFIX + sessionId, JSON.stringify(state));
  } catch {}
}

export function clearRestTimerState(sessionId: number) {
  try {
    localStorage.removeItem(REST_KEY_PREFIX + sessionId);
  } catch {}
}

export type ReconciledRest =
  | { kind: "keep" }
  | { kind: "clear" }
  | { kind: "running"; endAtMs: number; totalSec: number }
  | { kind: "paused"; pausedLeftMs: number; totalSec: number };

/**
 * Reconcilia el estado web con el servicio nativo cuando vuelves a la app desde YouTube/Google
 * (por ejemplo si pulsaste +15 s o Saltar desde la pastilla flotante).
 */
export function reconcileRestWithNative(
  native: NativeRestState | null,
  sessionId: number,
  nowMs: number,
): ReconciledRest {
  if (!native) return { kind: "keep" };
  if (native.sessionId !== 0 && native.sessionId !== sessionId) {
    return { kind: "keep" };
  }
  if (!native.active) {
    if (native.lastAction === "skip" || native.lastAction === "finished") {
      return { kind: "clear" };
    }
    return { kind: "keep" };
  }
  if (native.paused && native.pausedLeftMs > 0) {
    return { kind: "paused", pausedLeftMs: native.pausedLeftMs, totalSec: Math.max(1, native.totalSec) };
  }
  if (native.endAtMs > nowMs) {
    return { kind: "running", endAtMs: native.endAtMs, totalSec: Math.max(1, native.totalSec) };
  }
  return { kind: "clear" };
}

/**
 * Pequeño doble tono con Web Audio como respaldo cuando el descanso termina
 * en navegador/PWA normal (sin el servicio nativo Android).
 */
export function playWebRestChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes: readonly [start: number, freq: number, dur: number, gain: number][] = [
      [0, 880, 0.28, 0.16],
      [0.15, 1318.51, 0.45, 0.2],
    ];
    for (const [offset, freq, dur, peak] of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + offset);
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.exponentialRampToValueAtTime(peak, now + offset + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.02);
    }
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 900);
  } catch {}
}
