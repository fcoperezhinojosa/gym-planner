"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { startWorkout } from "@/app/actions";
import { ActivityForm } from "@/components/ActivityForm";
import { dayEmoji, dayTitle, slotColor } from "@/components/DayBadge";
import { DayOverride } from "@/components/DayOverride";
import type { RoutineOption } from "@/components/SlotEditor";
import { Button, Card, Pill, cx } from "@/components/ui";
import type { CalendarDay } from "@/lib/data";
import { isValidISODate, isoWeekday } from "@/lib/dates";
import { activityEmoji, activityLabel } from "@/lib/kcal";
import { WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/labels";
import { weekLetter } from "@/lib/schedule";
import { dayDone } from "@/lib/week";

/**
 * Rejilla del mes + detalle del día. Seleccionar un día es 100% cliente:
 * ya tenemos los datos de todo el mes, así que solo se actualiza la URL
 * (history.replaceState, que Next sincroniza con useSearchParams) sin ir al servidor.
 */
export function CalendarView({ days, month, today, routines, bodyWeightKg }: { days: CalendarDay[]; month: string; today: string; routines: RoutineOption[]; bodyWeightKg: number }) {
  const d = useSearchParams().get("d");
  const selected = isValidISODate(d) ? d : today;
  const sel = days.find((x) => x.date === selected) ?? null;
  const monthPrefix = month.slice(0, 7);
  // El formulario de actividad se abre para un día concreto: al cambiar de día se cierra solo.
  const [activityFormDate, setActivityFormDate] = useState<string | null>(null);
  const showActivityForm = activityFormDate === selected;

  function select(date: string) {
    window.history.replaceState(null, "", `/calendario?m=${month}&d=${date}`);
  }

  return (
    <>
      <Card className="p-2">
        <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const out = !day.date.startsWith(monthPrefix);
            const done = dayDone(day);
            const missed = !done && day.date < today && day.planned.kind !== "rest";
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => select(day.date)}
                aria-pressed={day.date === selected}
                aria-label={`${WEEKDAYS[isoWeekday(day.date) - 1]} ${Number(day.date.slice(8))}/${Number(day.date.slice(5, 7))}`}
                className={cx(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm",
                  out && "opacity-35",
                  day.date === selected ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-card-2",
                )}
              >
                <span className={cx("text-xs tabular", day.date === today && "font-bold text-accent")}>{Number(day.date.slice(8))}</span>
                <span className="text-base leading-none">{day.planned.kind === "rest" && !done ? "" : dayEmoji(day.planned)}</span>
                <span className="absolute bottom-1 h-1 w-4 rounded-full" style={{ background: done ? "var(--good)" : missed ? "var(--danger)" : day.planned.kind !== "rest" ? slotColor(day.planned) : "transparent", opacity: done || missed ? 1 : 0.5 }} />
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 px-2 pt-2 text-[11px] text-muted">
          <span className="flex items-center gap-1"><span className="h-1 w-4 rounded-full bg-good" /> Hecho</span>
          <span className="flex items-center gap-1"><span className="h-1 w-4 rounded-full bg-danger" /> No hecho</span>
          <span className="flex items-center gap-1"><span className="h-1 w-4 rounded-full bg-accent opacity-50" /> Planificado</span>
        </div>
      </Card>

      {sel && (
        <Card className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{dayEmoji(sel.planned)}</span>
            <div className="flex-1">
              <p className="text-xs text-muted">
                {WEEKDAYS[isoWeekday(sel.date) - 1]} {Number(sel.date.slice(8))}/{Number(sel.date.slice(5, 7))}
                {sel.planned.weekIndex !== null && sel.planned.source !== "none" && <> · Semana {weekLetter(sel.planned.weekIndex)}</>}
              </p>
              <h2 className="text-lg font-bold">{dayTitle(sel.planned)}</h2>
              {sel.planned.label && <p className="text-sm text-muted">{sel.planned.label}</p>}
              {sel.planned.source === "override" && <Pill className="mt-1">Cambiado solo este día</Pill>}
            </div>
          </div>
          {sel.sessions.map((s) => (
            <Link key={s.id} href={`/sesion/${s.id}`} className="block rounded-xl bg-card-2 px-3 py-2 text-sm hover:bg-line">
              🏋️ {s.name} {s.finished ? `· ${s.durationMin} min · ${s.kcal} kcal` : "· en curso"}
            </Link>
          ))}
          {sel.activities.map((a) => (
            <p key={a.id} className="rounded-xl bg-card-2 px-3 py-2 text-sm">
              {activityEmoji(a.type)} {activityLabel(a.type)} · {a.durationMin} min · {a.kcal} kcal
            </p>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            {sel.date <= today && (
              <form action={startWorkout.bind(null, sel.planned.kind === "workout" ? sel.planned.routineId : null, sel.date)}>
                <Button size="sm" variant="secondary">
                  {sel.date === today ? "Empezar" : "Registrar"} {sel.planned.kind === "workout" && sel.planned.routineName ? sel.planned.routineName : "entreno libre"}
                </Button>
              </form>
            )}
            {sel.date <= today && (
              <button type="button" onClick={() => setActivityFormDate(showActivityForm ? null : selected)} className="text-sm text-accent">
                {showActivityForm ? "Cancelar" : "+ Actividad"}
              </button>
            )}
            <DayOverride key={sel.date} date={sel.date} current={sel.planned} isOverride={sel.planned.source === "override"} routines={routines} />
          </div>
          {showActivityForm && (
            <div className="border-t border-line pt-3">
              <ActivityForm today={sel.date} bodyWeightKg={bodyWeightKg} defaultType="other" />
            </div>
          )}
        </Card>
      )}
    </>
  );
}
