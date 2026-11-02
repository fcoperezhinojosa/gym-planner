import type { CalendarDay } from "./data";

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
