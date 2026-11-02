import { diffDays, isoWeekday } from "./dates";

export type DayKind = "workout" | "rest" | "activity";

export interface DaySlot {
  kind: DayKind;
  routineId: number | null;
  activityType: string | null;
  label: string | null;
}

export interface PlanLike {
  startDate: string;
  cycleWeeks: number;
}

export interface PlanDayLike extends DaySlot {
  weekIndex: number;
  weekday: number;
}

export interface OverrideLike extends DaySlot {
  date: string;
}

/**
 * Semana del ciclo (0..cycleWeeks-1) que toca en una fecha.
 * La semana 0 es la que contiene start_date (contando desde su lunes).
 */
export function weekIndexFor(date: string, plan: PlanLike): number {
  const cycle = Math.max(1, plan.cycleWeeks);
  const startMonday = diffDays(plan.startDate, "1970-01-05") - (isoWeekday(plan.startDate) - 1);
  const dateMonday = diffDays(date, "1970-01-05") - (isoWeekday(date) - 1);
  const weeks = Math.floor((dateMonday - startMonday) / 7);
  return ((weeks % cycle) + cycle) % cycle;
}

export const REST_DAY: DaySlot = { kind: "rest", routineId: null, activityType: null, label: null };

/** Qué toca un día: primero la excepción del calendario, si no el plan. */
export function resolveDay(
  date: string,
  plan: PlanLike | null,
  days: PlanDayLike[],
  overrides: OverrideLike[] = [],
): DaySlot & { source: "override" | "plan" | "none"; weekIndex: number | null } {
  const ov = overrides.find((o) => o.date === date);
  const weekIndex = plan ? weekIndexFor(date, plan) : null;
  if (ov) return { kind: ov.kind, routineId: ov.routineId, activityType: ov.activityType, label: ov.label, source: "override", weekIndex };
  // Antes de empezar el plan no hay nada planificado (no cuenta para el cumplimiento).
  if (!plan || date < plan.startDate) return { ...REST_DAY, source: "none", weekIndex };
  const wd = isoWeekday(date);
  const d = days.find((x) => x.weekIndex === weekIndex && x.weekday === wd);
  if (!d) return { ...REST_DAY, source: "plan", weekIndex };
  return { kind: d.kind, routineId: d.routineId, activityType: d.activityType, label: d.label, source: "plan", weekIndex };
}

export function weekLetter(i: number) {
  return String.fromCharCode(65 + i);
}
