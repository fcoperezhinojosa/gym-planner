/**
 * Estimación de kcal con MET (Compendium of Physical Activities).
 * kcal = MET × peso_kg × horas. Son estimaciones, no medidas.
 */

export type Intensity = "light" | "moderate" | "vigorous";

export const INTENSITIES: Record<Intensity, string> = {
  light: "Suave",
  moderate: "Moderada",
  vigorous: "Intensa",
};

export const ACTIVITY_TYPES: Record<string, { label: string; emoji: string; met: Record<Intensity, number> }> = {
  gym: { label: "Gimnasio", emoji: "🏋️", met: { light: 3.5, moderate: 5, vigorous: 6 } },
  padel: { label: "Pádel", emoji: "🎾", met: { light: 5, moderate: 6.5, vigorous: 8 } },
  running: { label: "Correr", emoji: "🏃", met: { light: 7, moderate: 9.8, vigorous: 11.5 } },
  cycling: { label: "Bici", emoji: "🚴", met: { light: 5.8, moderate: 7.5, vigorous: 10 } },
  swimming: { label: "Natación", emoji: "🏊", met: { light: 5.8, moderate: 8, vigorous: 9.8 } },
  walking: { label: "Caminar", emoji: "🚶", met: { light: 2.8, moderate: 3.5, vigorous: 5 } },
  football: { label: "Fútbol", emoji: "⚽", met: { light: 5, moderate: 7, vigorous: 10 } },
  yoga: { label: "Yoga / movilidad", emoji: "🧘", met: { light: 2, moderate: 2.5, vigorous: 4 } },
  other: { label: "Otra", emoji: "✨", met: { light: 3.5, moderate: 5, vigorous: 7 } },
};

export function metFor(type: string, intensity: Intensity): number {
  return (ACTIVITY_TYPES[type] ?? ACTIVITY_TYPES.other).met[intensity] ?? 5;
}

export function estimateKcal(met: number, bodyWeightKg: number, durationMin: number): number {
  if (!(met > 0) || !(bodyWeightKg > 0) || !(durationMin > 0)) return 0;
  return Math.round(met * bodyWeightKg * (durationMin / 60));
}

export function activityLabel(type: string | null | undefined) {
  if (!type) return "Actividad";
  return ACTIVITY_TYPES[type]?.label ?? type;
}
export function activityEmoji(type: string | null | undefined) {
  return (type && ACTIVITY_TYPES[type]?.emoji) || "✨";
}

export function isIntensity(v: unknown): v is Intensity {
  return v === "light" || v === "moderate" || v === "vigorous";
}
