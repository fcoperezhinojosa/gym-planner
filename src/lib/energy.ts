/**
 * Balance energético: kcal gastadas (metabolismo + ejercicio) frente a kcal consumidas.
 * Todo son estimaciones orientativas.
 */
import { addDays, addMonths, formatShort, startOfMonth, startOfWeek } from "./dates";
import { MONTHS } from "./labels";

export type Sex = "male" | "female";

export function isSex(v: unknown): v is Sex {
  return v === "male" || v === "female";
}

/** Factor de actividad "sedentario": el ejercicio se suma aparte, así no se cuenta dos veces. */
export const NEAT_FACTOR = 1.2;

/**
 * Metabolismo basal (Mifflin-St Jeor). Si faltan datos, aproximación de 22 kcal/kg.
 * `exact` indica si se ha podido usar la fórmula completa.
 */
export function basalKcal(p: { sex?: string | null; age?: number | null; heightCm?: number | null; weightKg: number }): {
  kcal: number;
  exact: boolean;
} {
  const { sex, age, heightCm, weightKg } = p;
  if (isSex(sex) && age && age > 0 && heightCm && heightCm > 0) {
    const kcal = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
    return { kcal: Math.round(kcal), exact: true };
  }
  return { kcal: Math.round(22 * weightKg), exact: false };
}

/** Gasto diario sin ejercicio: basal × factor sedentario. */
export function baseDailyKcal(bmr: number): number {
  return Math.round(bmr * NEAT_FACTOR);
}

export type EnergyDay = {
  date: string;
  /** kcal de gimnasio (entrenos + actividades tipo gym) */
  gym: number;
  /** kcal del resto de actividades */
  other: number;
  /** kcal consumidas registradas ese día; null = sin registro */
  intake: number | null;
};

export type Period = "day" | "week" | "month";

export type EnergyBucket = {
  key: string;
  label: string;
  days: number;
  base: number;
  gym: number;
  other: number;
  burned: number;
  /** null si ningún día del bucket tiene dato de consumo (ni registro ni valor habitual) */
  intake: number | null;
  /** días con consumo conocido */
  intakeDays: number;
  /** consumo − gasto en los días con consumo conocido (negativo = déficit) */
  balance: number | null;
};

function bucketKey(date: string, period: Period) {
  return period === "day" ? date : period === "week" ? startOfWeek(date) : startOfMonth(date);
}

function bucketLabel(key: string, period: Period) {
  if (period === "month") return `${MONTHS[Number(key.slice(5, 7)) - 1].slice(0, 3)} ${key.slice(2, 4)}`;
  return formatShort(key);
}

/**
 * Agrupa días en buckets (día/semana/mes). `days` debe venir ordenado y sin huecos,
 * terminando como mucho en hoy (no se cuenta gasto basal de días futuros).
 */
export function aggregateEnergy(days: EnergyDay[], period: Period, base: number, defaultIntake: number | null): EnergyBucket[] {
  const map = new Map<string, EnergyBucket & { burnedKnown: number }>();
  for (const d of days) {
    const key = bucketKey(d.date, period);
    let b = map.get(key);
    if (!b) {
      b = { key, label: bucketLabel(key, period), days: 0, base: 0, gym: 0, other: 0, burned: 0, intake: null, intakeDays: 0, balance: null, burnedKnown: 0 };
      map.set(key, b);
    }
    const burned = base + d.gym + d.other;
    b.days++;
    b.base += base;
    b.gym += d.gym;
    b.other += d.other;
    b.burned += burned;
    const intake = d.intake ?? defaultIntake;
    if (intake !== null && intake !== undefined) {
      b.intake = (b.intake ?? 0) + intake;
      b.intakeDays++;
      b.burnedKnown += burned;
    }
  }
  return [...map.values()].map(({ burnedKnown, ...b }) => ({ ...b, balance: b.intake === null ? null : b.intake - burnedKnown }));
}

/** Primer día del rango que se muestra para cada periodo. */
export function periodStart(today: string, period: Period, count: number): string {
  if (period === "day") return addDays(today, -(count - 1));
  if (period === "week") return addDays(startOfWeek(today), -7 * (count - 1));
  return addMonths(today, -(count - 1));
}

/** ~7700 kcal ≈ 1 kg de grasa. */
export function kgPerWeek(dailyBalance: number): number {
  return Math.round(((dailyBalance * 7) / 7700) * 100) / 100;
}

export type Verdict = { tone: "good" | "warn" | "danger" | "neutral"; title: string; text: string };

/** Lectura orientativa del balance medio diario. */
export function energyVerdict(dailyBalance: number | null): Verdict {
  if (dailyBalance === null)
    return { tone: "neutral", title: "Falta lo que comes", text: "Registra tus kcal consumidas (o pon tu consumo habitual en el perfil) para ver el balance." };
  const b = Math.round(dailyBalance);
  const kg = Math.abs(kgPerWeek(b));
  if (b > 250)
    return {
      tone: "warn",
      title: `Superávit de ${b} kcal/día`,
      text: `Comes más de lo que gastas (≈ +${kg} kg/semana). Si tu objetivo es perder grasa, baja el ritmo de comida unas ${b} kcal/día o súbelas en actividad.`,
    };
  if (b >= -250)
    return { tone: "good", title: "Balance equilibrado", text: `Comes más o menos lo que gastas (${b > 0 ? "+" : ""}${b} kcal/día). Ideal para mantener peso.` };
  if (b >= -750)
    return { tone: "good", title: `Déficit de ${-b} kcal/día`, text: `Déficit moderado (≈ −${kg} kg/semana). Buen ritmo para perder grasa sin perder rendimiento.` };
  return {
    tone: "danger",
    title: `Déficit de ${-b} kcal/día`,
    text: `Déficit muy alto (≈ −${kg} kg/semana). Puede costarte rendimiento y recuperación: quizá debas comer algo más los días de entreno.`,
  };
}
