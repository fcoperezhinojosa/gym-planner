import type { Metadata } from "next";
import Link from "next/link";
import { startWorkout } from "@/app/actions";
import { dayEmoji, dayTitle, slotColor } from "@/components/DayBadge";
import { DayOverride } from "@/components/DayOverride";
import { Button, Card, PageHeader, Pill, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCalendar, listRoutines } from "@/lib/data";
import { addDays, addMonths, daysInMonth, isValidISODate, isoWeekday, startOfMonth, todayISO } from "@/lib/dates";
import { activityEmoji, activityLabel } from "@/lib/kcal";
import { MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/labels";
import { weekLetter } from "@/lib/schedule";
import { dayDone, summarizeDays } from "@/lib/week";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayISO();
  const selected = isValidISODate(sp.d) ? sp.d : today;
  const month = isValidISODate(sp.m) ? startOfMonth(sp.m) : startOfMonth(selected);
  const lead = isoWeekday(month) - 1;
  const gridStart = addDays(month, -lead);
  const cells = Math.ceil((lead + daysInMonth(month)) / 7) * 7;
  const [days, routines] = await Promise.all([getCalendar(user.id, gridStart, cells), listRoutines(user.id)]);
  const inMonth = days.filter((d) => d.date.startsWith(month.slice(0, 7)));
  const sum = summarizeDays(inMonth, today);
  const sel = days.find((d) => d.date === selected) ?? null;
  const [y, m] = month.split("-").map(Number);
  const routineOptions = routines.map((r) => ({ id: r.id, name: r.name, color: r.color }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${MONTHS[m - 1]} ${y}`}
        subtitle={`${sum.done} días entrenados · ${sum.minutes} min · ${sum.kcal.toLocaleString("es-ES")} kcal`}
        action={
          <div className="flex gap-1">
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-card-2" href={`/calendario?m=${addMonths(month, -1)}`} aria-label="Mes anterior">←</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-card-2" href="/calendario">Hoy</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-card-2" href={`/calendario?m=${addMonths(month, 1)}`} aria-label="Mes siguiente">→</Link>
          </div>
        }
      />

      <Card className="p-2">
        <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const out = !d.date.startsWith(month.slice(0, 7));
            const done = dayDone(d);
            const missed = !done && d.date < today && d.planned.kind !== "rest";
            return (
              <Link
                key={d.date}
                href={`/calendario?m=${month}&d=${d.date}`}
                scroll={false}
                className={cx(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm",
                  out && "opacity-35",
                  d.date === selected ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-card-2",
                )}
              >
                <span className={cx("text-xs tabular", d.date === today && "font-bold text-accent")}>{Number(d.date.slice(8))}</span>
                <span className="text-base leading-none">{d.planned.kind === "rest" && !done ? "" : dayEmoji(d.planned)}</span>
                <span className="absolute bottom-1 h-1 w-4 rounded-full" style={{ background: done ? "var(--good)" : missed ? "var(--danger)" : d.planned.kind !== "rest" ? slotColor(d.planned) : "transparent", opacity: done || missed ? 1 : 0.5 }} />
              </Link>
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
            {sel.date <= today && <Link href="/actividades" className="text-sm text-accent">+ Actividad</Link>}
            <DayOverride date={sel.date} current={sel.planned} isOverride={sel.planned.source === "override"} routines={routineOptions} />
          </div>
        </Card>
      )}
    </div>
  );
}
