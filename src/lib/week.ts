import type { CalendarDay } from "./data";
import { activityEmoji, activityLabel } from "./kcal";
import type { DaySlot } from "./schedule";

export function summarizeDays(days: CalendarDay[], today: string) {
  const planned = days.filter((d) => d.planned.kind !== "rest").length;
  const done = days.filter((d) => d.sessions.some((s) => s.finished) || d.activities.length > 0).length;
  const plannedToDate = days.filter((d) => d.date <= today && d.planned.kind !== "rest").length;
  const minutes =
    days.reduce((a, d) => a + d.sessions.reduce((x, s) => x + (s.durationMin ?? 0), 0) + d.activities.reduce((x, s) => x + s.durationMin, 0), 0);
  const kcal = days.reduce((a, d) => a + d.sessions.reduce((x, s) => x + (s.kcal ?? 0), 0) + d.activities.reduce((x, s) => x + s.kcal, 0), 0);
  const gymSessions = days.reduce((a, d) => a + d.sessions.filter((s) => s.finished).length, 0);
  const activities = days.reduce((a, d) => a + d.activities.length, 0);
  return { planned, done, plannedToDate, minutes, kcal, gymSessions, activities };
}

export function dayDone(d: CalendarDay) {
  return d.sessions.some((s) => s.finished) || d.activities.length > 0;
}

/** Emojis de lo realizado realmente en un día (sin duplicar). */
export function doneDayEmojis(d: Pick<CalendarDay, "sessions" | "activities">): string[] {
  const emojis: string[] = [];
  if (d.sessions.some((s) => s.finished)) emojis.push("🏋️");
  for (const a of d.activities) emojis.push(activityEmoji(a.type));
  return [...new Set(emojis)];
}

/** Título resumen de lo realizado en un día ("Pierna + Caminar"). */
export function doneDayTitle(d: Pick<CalendarDay, "sessions" | "activities">): string {
  const parts: string[] = [];
  for (const s of d.sessions) {
    if (s.finished) parts.push(s.name);
  }
  for (const a of d.activities) parts.push(activityLabel(a.type));
  return [...new Set(parts)].join(" + ");
}

function plannedSlotEmojis(slot: DaySlot): string[] {
  const main = slot.kind === "workout" ? "🏋️" : slot.kind === "activity" ? activityEmoji(slot.activityType) : "😴";
  return [...new Set([main, ...(slot.extraActivities ?? []).map(activityEmoji)])];
}

/**
 * Emojis a mostrar en una celda del calendario:
 * - Si hay entreno terminado o actividad registrada, muestra lo realmente hecho (p. ej. 🚶 si solo caminó).
 * - Si no se hizo nada pero había algo planificado, muestra lo planificado.
 * - Si no se hizo nada y el día es de descanso (pasado, hoy o marcado explícitamente como descanso), muestra 😴.
 * - En días futuros sin nada planificado, no muestra emoji.
 */
export function calendarCellEmojis(d: CalendarDay, today: string): string[] {
  const done = doneDayEmojis(d);
  if (done.length > 0) return done;
  if (d.planned.kind !== "rest") return plannedSlotEmojis(d.planned);
  if (d.date <= today || d.planned.source === "override") return ["😴"];
  return [];
}
