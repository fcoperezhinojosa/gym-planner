"use client";

import Link, { useLinkStatus } from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { startWorkout } from "@/app/actions";
import { ActivityForm } from "@/components/ActivityForm";
import { dayEmoji, dayEmojis, dayTitle, slotColor } from "@/components/DayBadge";
import { DayOverride } from "@/components/DayOverride";
import type { RoutineOption } from "@/components/SlotEditor";
import { Button, Card, PageHeader, Pill, cx } from "@/components/ui";
import type { CalendarDay } from "@/lib/data";
import { addMonths, isoWeekday, startOfMonth } from "@/lib/dates";
import { activityEmoji, activityLabel } from "@/lib/kcal";
import { MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/labels";
import { weekLetter } from "@/lib/schedule";
import { dayDone } from "@/lib/week";

type NavKey = "prev" | "today" | "next";

function MonthLinkLabel({
  id,
  children,
  onPendingChange,
}: {
  id: NavKey;
  children: React.ReactNode;
  onPendingChange: (id: NavKey, pending: boolean) => void;
}) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onPendingChange(id, pending);
  }, [id, pending, onPendingChange]);

  return <span className={cx("inline-flex items-center gap-1 transition-opacity", pending && "opacity-50")}>{children}</span>;
}

export function CalendarView({
  month,
  today,
  initialSelected,
  days,
  routineOptions,
  summary,
  bodyWeightKg,
}: {
  month: string;
  today: string;
  initialSelected: string;
  days: CalendarDay[];
  routineOptions: RoutineOption[];
  summary: { done: number; minutes: number; kcal: number };
  bodyWeightKg: number;
}) {
  const [selected, setSelected] = useState(initialSelected);
  // El formulario de actividad se abre para un día concreto: al cambiar de día se cierra solo.
  const [activityFormDate, setActivityFormDate] = useState<string | null>(null);
  const [pendingNav, setPendingNav] = useState<Record<NavKey, boolean>>({ prev: false, today: false, next: false });
  const [startingWorkout, startWorkoutTransition] = useTransition();

  const handlePendingChange = useCallback((id: NavKey, pending: boolean) => {
    setPendingNav((prev) => (prev[id] === pending ? prev : { ...prev, [id]: pending }));
  }, []);

  const monthPending = pendingNav.prev || pendingNav.today || pendingNav.next;
  const [y, m] = month.split("-").map(Number);
  const sel = days.find((d) => d.date === selected) ?? days.find((d) => d.date === month) ?? days[0] ?? null;
  const isCurrentMonth = month === startOfMonth(today);
  const showActivityForm = sel !== null && activityFormDate === sel.date;

  function selectDay(date: string) {
    setSelected(date);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/calendario?m=${month}&d=${date}`);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${MONTHS[m - 1]} ${y}`}
        subtitle={`${summary.done} días entrenados · ${summary.minutes} min · ${summary.kcal.toLocaleString("es-ES")} kcal`}
        action={
          <div className="flex items-center gap-1">
            {monthPending && (
              <span
                className="mr-1 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-accent"
                aria-label="Cargando mes"
              />
            )}
            <Link
              className="rounded-lg px-3 py-2 text-sm hover:bg-card-2"
              href={`/calendario?m=${addMonths(month, -1)}`}
              prefetch={true}
              aria-label="Mes anterior"
            >
              <MonthLinkLabel id="prev" onPendingChange={handlePendingChange}>
                ←
              </MonthLinkLabel>
            </Link>
            {isCurrentMonth ? (
              <button
                type="button"
                onClick={() => selectDay(today)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-card-2"
              >
                Hoy
              </button>
            ) : (
              <Link className="rounded-lg px-3 py-2 text-sm hover:bg-card-2" href="/calendario" prefetch={true}>
                <MonthLinkLabel id="today" onPendingChange={handlePendingChange}>
                  Hoy
                </MonthLinkLabel>
              </Link>
            )}
            <Link
              className="rounded-lg px-3 py-2 text-sm hover:bg-card-2"
              href={`/calendario?m=${addMonths(month, 1)}`}
              prefetch={true}
              aria-label="Mes siguiente"
            >
              <MonthLinkLabel id="next" onPendingChange={handlePendingChange}>
                →
              </MonthLinkLabel>
            </Link>
          </div>
        }
      />

      <Card className={cx("p-2 transition-opacity", monthPending && "pointer-events-none animate-pulse opacity-60")}>
        <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS_SHORT.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const out = !d.date.startsWith(month.slice(0, 7));
            const done = dayDone(d);
            const missed = !done && d.date < today && d.planned.kind !== "rest";
            const isSelected = sel?.date === d.date;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => selectDay(d.date)}
                aria-pressed={isSelected}
                aria-label={`${d.date}: ${dayTitle(d.planned)}`}
                className={cx(
                  "relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg text-sm transition-colors",
                  out && "opacity-35",
                  isSelected ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-card-2",
                )}
              >
                <span className={cx("text-xs tabular", d.date === today && "font-bold text-accent")}>{Number(d.date.slice(8))}</span>
                <CellEmojis slot={d.planned} hidden={d.planned.kind === "rest" && !done} />
                <span
                  className="absolute bottom-1 h-1 w-4 rounded-full"
                  style={{
                    background: done ? "var(--good)" : missed ? "var(--danger)" : d.planned.kind !== "rest" ? slotColor(d.planned) : "transparent",
                    opacity: done || missed ? 1 : 0.5,
                  }}
                />
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 px-2 pt-2 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <span className="h-1 w-4 rounded-full bg-good" /> Hecho
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1 w-4 rounded-full bg-danger" /> No hecho
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1 w-4 rounded-full bg-accent opacity-50" /> Planificado
          </span>
        </div>
      </Card>

      {sel && (
        <Card className={cx("space-y-3 p-4 transition-opacity", monthPending && "animate-pulse opacity-60")}>
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
              <Button
                size="sm"
                variant="secondary"
                disabled={startingWorkout}
                onClick={() =>
                  startWorkoutTransition(async () => {
                    await startWorkout(sel.planned.kind === "workout" ? sel.planned.routineId : null, sel.date);
                  })
                }
              >
                {startingWorkout
                  ? "Abriendo..."
                  : `${sel.date === today ? "Empezar" : "Registrar"} ${
                      sel.planned.kind === "workout" && sel.planned.routineName ? sel.planned.routineName : "entreno libre"
                    }`}
              </Button>
            )}
            {sel.date <= today && (
              <button type="button" onClick={() => setActivityFormDate(showActivityForm ? null : sel.date)} className="text-sm text-accent">
                {showActivityForm ? "Cancelar" : "+ Actividad"}
              </button>
            )}
            <DayOverride
              key={sel.date}
              date={sel.date}
              current={sel.planned}
              isOverride={sel.planned.source === "override"}
              routines={routineOptions}
              showAddActivity={sel.date > today}
            />
          </div>
          {showActivityForm && (
            <div className="border-t border-line pt-3">
              <ActivityForm key={sel.date} today={sel.date} bodyWeightKg={bodyWeightKg} defaultType="other" />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/** Emojis de la celda: hasta 2 y "+N" si hay más, para que quepa en móvil. */
function CellEmojis({ slot, hidden }: { slot: CalendarDay["planned"]; hidden: boolean }) {
  if (hidden) return <span className="text-base leading-none" />;
  const all = dayEmojis(slot);
  const shown = all.slice(0, 2);
  return (
    <span className={cx("flex items-center leading-none", all.length > 1 ? "text-sm" : "text-base")}>
      {shown.join("")}
      {all.length > 2 && <span className="ml-0.5 text-[10px] font-semibold text-muted">+{all.length - 2}</span>}
    </span>
  );
}
