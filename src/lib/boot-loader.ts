export const SESSION_BOOT_KEY = "gp:booted";
export const SESSION_BOOT_START_KEY = "gp:boot-start";
export const SESSION_BOOT_CONFIG_KEY = "gp:boot-config";
export const SESSION_BOOT_STEPS_KEY = "gp:boot-steps";
export const LAST_VARIANT_KEY = "gp:last-variant";
export const LAST_WELCOME_KEY = "gp:last-welcome";
export const SESSION_BOOT_ATTR = "data-gp-booted";
export const SESSION_BOOT_VARIANT_ATTR = "data-gp-variant";

export type LoaderVariant = 0 | 1 | 2;
export const LOADER_VARIANT_COUNT = 3;

export type BootStep = {
  activeLabel: string;
  doneLabel: string;
  emoji: string;
};

/** 12 checks divertidos de los que se eligen 3 aleatorios en cada inicio de sesión. */
export const BOOT_STEPS: readonly BootStep[] = [
  { activeLabel: "Leyendo tus objetivos…", doneLabel: "Leídos tus objetivos", emoji: "🎯" },
  { activeLabel: "Cargando tu plan de hoy…", doneLabel: "Cargado tu plan de hoy", emoji: "📅" },
  { activeLabel: "Cargando tu rutina…", doneLabel: "Cargada tu rutina", emoji: "💪" },
  { activeLabel: "Preparando los discos…", doneLabel: "Discos listos en la barra", emoji: "🏋️" },
  { activeLabel: "Revisando tus récords…", doneLabel: "Récords personales listos", emoji: "🏆" },
  { activeLabel: "Comprobando tu racha…", doneLabel: "Tu racha está a salvo", emoji: "🔥" },
  { activeLabel: "Calibrando el cronómetro…", doneLabel: "Descansos cronometrados", emoji: "⏱️" },
  { activeLabel: "Calculando tus cargas…", doneLabel: "Pesos sugeridos listos", emoji: "⚡" },
  { activeLabel: "Echando magnesio a la barra…", doneLabel: "Agarre al 100 %", emoji: "🙌" },
  { activeLabel: "Ajustando tu balance calórico…", doneLabel: "Kcal de la semana al día", emoji: "🔋" },
  { activeLabel: "Sincronizando tus series…", doneLabel: "Historial sincronizado", emoji: "📊" },
  { activeLabel: "Calentando motores…", doneLabel: "Cuerpo en modo entreno", emoji: "🚀" },
];

/** 4 mensajes de bienvenida y motivación que rotan aleatoriamente por sesión. */
export const WELCOME_MESSAGES: readonly string[] = [
  "¡Hola de nuevo! Hoy toca darlo todo",
  "¡Bienvenido! Cada serie cuenta",
  "¡A por todas! Tu mejor versión te espera",
  "¡Qué bueno verte! Vamos a superar marcas",
];

export type BootConfig = {
  variant: LoaderVariant;
  welcomeIndex: number;
  stepIndices: [number, number, number];
};

function pickIndexAvoiding(count: number, avoid: number | null | undefined, rng: () => number): number {
  const candidates: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i !== avoid) candidates.push(i);
  }
  const list = candidates.length > 0 ? candidates : [0];
  return list[Math.floor(rng() * list.length) % list.length];
}

/**
 * Elige aleatoriamente 1 de los 3 loaders, 1 de los 4 mensajes y 3 de los 12 checks sin repetir.
 * Si se indica `avoid`, evita repetir el mismo icono y mensaje que en la sesión anterior.
 */
export function pickBootConfig(
  rng: () => number = Math.random,
  avoid?: { variant?: number | null; welcomeIndex?: number | null },
): BootConfig {
  const pool = Array.from({ length: BOOT_STEPS.length }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const variant = pickIndexAvoiding(LOADER_VARIANT_COUNT, avoid?.variant, rng) as LoaderVariant;
  const welcomeIndex = pickIndexAvoiding(WELCOME_MESSAGES.length, avoid?.welcomeIndex, rng);
  return {
    variant,
    welcomeIndex,
    stepIndices: [pool[0], pool[1], pool[2]],
  };
}

export function resolveBootConfig(config: BootConfig): {
  variant: LoaderVariant;
  welcomeMessage: string;
  steps: BootStep[];
} {
  const variant = ([0, 1, 2].includes(config.variant) ? config.variant : 2) as LoaderVariant;
  const welcomeMessage = WELCOME_MESSAGES[config.welcomeIndex % WELCOME_MESSAGES.length] ?? WELCOME_MESSAGES[0];
  const steps = config.stepIndices.map((idx) => BOOT_STEPS[idx % BOOT_STEPS.length] ?? BOOT_STEPS[0]);
  return { variant, welcomeMessage, steps };
}

function isValidBootConfig(v: unknown): v is BootConfig {
  if (!v || typeof v !== "object") return false;
  const c = v as Partial<BootConfig>;
  return (
    (c.variant === 0 || c.variant === 1 || c.variant === 2) &&
    typeof c.welcomeIndex === "number" &&
    c.welcomeIndex >= 0 &&
    c.welcomeIndex < WELCOME_MESSAGES.length &&
    Array.isArray(c.stepIndices) &&
    c.stepIndices.length === 3 &&
    c.stepIndices.every((n) => typeof n === "number" && n >= 0 && n < BOOT_STEPS.length)
  );
}

function readPreviousChoice(): { variant: number | null; welcomeIndex: number | null } {
  try {
    const vRaw = localStorage.getItem(LAST_VARIANT_KEY);
    const wRaw = localStorage.getItem(LAST_WELCOME_KEY);
    const v = vRaw !== null ? Number(vRaw) : NaN;
    const w = wRaw !== null ? Number(wRaw) : NaN;
    return {
      variant: Number.isInteger(v) ? v : null,
      welcomeIndex: Number.isInteger(w) ? w : null,
    };
  } catch {
    return { variant: null, welcomeIndex: null };
  }
}

function persistLastChoice(cfg: BootConfig | null) {
  if (!cfg) return;
  try {
    localStorage.setItem(LAST_VARIANT_KEY, String(cfg.variant));
    localStorage.setItem(LAST_WELCOME_KEY, String(cfg.welcomeIndex));
  } catch {}
}

// Caché en memoria para mantener referencias estables en useSyncExternalStore.
let cachedRaw: string | null = null;
let cachedConfig: BootConfig | null = null;

function storeBootConfig(cfg: BootConfig): BootConfig {
  const raw = JSON.stringify(cfg);
  cachedRaw = raw;
  cachedConfig = cfg;
  try {
    sessionStorage.setItem(SESSION_BOOT_CONFIG_KEY, raw);
  } catch {}
  try {
    document.documentElement.setAttribute(SESSION_BOOT_VARIANT_ATTR, String(cfg.variant));
  } catch {}
  return cfg;
}

export function createAndStoreBootConfig(): BootConfig {
  return storeBootConfig(pickBootConfig(Math.random, readPreviousChoice()));
}

export function readOrCreateBootConfig(): BootConfig {
  try {
    const raw = sessionStorage.getItem(SESSION_BOOT_CONFIG_KEY);
    if (raw) {
      if (raw === cachedRaw && cachedConfig) return cachedConfig;
      const parsed: unknown = JSON.parse(raw);
      if (isValidBootConfig(parsed)) {
        cachedRaw = raw;
        cachedConfig = parsed;
        return parsed;
      }
    }
  } catch {}
  if (cachedConfig) return cachedConfig;
  return createAndStoreBootConfig();
}

export function isSessionBooted(): boolean {
  try {
    return sessionStorage.getItem(SESSION_BOOT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSessionBooted() {
  const current = cachedConfig ?? (() => {
    try {
      const raw = sessionStorage.getItem(SESSION_BOOT_CONFIG_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return isValidBootConfig(parsed) ? parsed : null;
    } catch {
      return null;
    }
  })();
  persistLastChoice(current);

  cachedRaw = null;
  cachedConfig = null;
  try {
    sessionStorage.setItem(SESSION_BOOT_KEY, "1");
    sessionStorage.removeItem(SESSION_BOOT_START_KEY);
    sessionStorage.removeItem(SESSION_BOOT_CONFIG_KEY);
    sessionStorage.removeItem(SESSION_BOOT_STEPS_KEY);
  } catch {}
  try {
    document.documentElement.setAttribute(SESSION_BOOT_ATTR, "1");
    document.documentElement.removeAttribute(SESSION_BOOT_VARIANT_ATTR);
  } catch {}
}

export function resetSessionBoot() {
  cachedRaw = null;
  cachedConfig = null;
  try {
    sessionStorage.removeItem(SESSION_BOOT_KEY);
    sessionStorage.removeItem(SESSION_BOOT_START_KEY);
    sessionStorage.removeItem(SESSION_BOOT_CONFIG_KEY);
    sessionStorage.removeItem(SESSION_BOOT_STEPS_KEY);
  } catch {}
  try {
    document.documentElement.removeAttribute(SESSION_BOOT_ATTR);
    document.documentElement.removeAttribute(SESSION_BOOT_VARIANT_ATTR);
  } catch {}
}

export function markSessionBootStart() {
  try {
    sessionStorage.setItem(SESSION_BOOT_START_KEY, String(Date.now()));
  } catch {}
}

export function readSessionBootStart(): number | null {
  try {
    const raw = sessionStorage.getItem(SESSION_BOOT_START_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeSessionBootSteps(count: number) {
  try {
    sessionStorage.setItem(SESSION_BOOT_STEPS_KEY, String(Math.max(0, Math.min(3, count))));
  } catch {}
}

export function readSessionBootSteps(): number {
  try {
    const raw = sessionStorage.getItem(SESSION_BOOT_STEPS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
  } catch {
    return 0;
  }
}
