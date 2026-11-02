import Link from "next/link";
import { startWorkout } from "@/app/actions";
import { ActivityForm } from "@/components/ActivityForm";
import { dayEmoji, dayTitle, slotColor } from "@/components/DayBadge";
import { DayOverride } from "@/components/DayOverride";
import { Button, Card, LinkButton, Pill, Stat, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCalendar, getOpenSession, getRoutine, listRoutines } from "@/lib/data";
import { startOfWeek, todayISO } from "@/lib/dates";
import { activityEmoji, activityLabel } from "@/lib/kcal";
import { MONTHS, WEEKDAYS, WEEKDAYS_SHORT, muscleLabel } from "@/lib/labels";
import { weekLetter } from "@/lib/schedule";
import { dayDone, summarizeDays } from "@/lib/week";

export default async function TodayPage() {
  const user = await requireUser();
  const today = todayISO();
  const [week, open, routines] = await Promise.all([getCalendar(user.id, startOfWeek(today), 7), getOpenSession(user.id), listRoutines(user.id)]);
  const day = week.find((d) => d.date === today)!;
  const routine = day.planned.kind === "workout" && day.planned.routineId ? await getRoutine(user.id, day.planned.routineId) : null;
  const sum = summarizeDays(week, today);
  const [y, m, d] = today.split("-").map(Number);
  const wd = week.findIndex((x) => x.date === today);
  const routineOptions = routines.map((r) => ({ id: r.id, name: r.name, color: r.color }));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted">
          {WEEKDAYS[wd]}, {d} de {MONTHS[m - 1].toLowerCase()} {y}
          {day.planned.weekIndex !== null && day.planned.source !== "none" && <> · Semana {weekLetter(day.planned.weekIndex)}</>}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {user.name.split(" ")[0]}</h1>
      </header>

      {open && (
        <Link href={`/sesion/${open.id}`} className="flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-fg">
          <span>
            <span className="block text-xs opacity-80">Entrenamiento en curso</span>
            <span className="font-semibold">{open.name}</span>
          </span>
          <span className="font-semibold">Continuar →</span>
        </Link>
      )}

      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: slotColor(day.planned) }} />
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="text-4xl">{dayEmoji(day.planned)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Hoy toca</p>
              <h2 className="text-xl font-bold">{dayTitle(day.planned)}</h2>
              {day.planned.label && <p className="text-sm text-muted">{day.planned.label}</p>}
              {day.planned.source === "override" && <Pill className="mt-1">Cambiado solo hoy</Pill>}
            </div>
          </div>

          {routine && (
            <ul className="space-y-1.5">
              {routine.exercises.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{e.name}</span>
                  <span className="shrink-0 text-xs text-muted tabular">
                    {e.sets.length}×{e.sets[0]?.reps ?? "-"} · {e.sets[0]?.weightKg ?? 0} kg
                  </span>
                </li>
              ))}
              {routine.exercises.length === 0 && <li className="text-sm text-muted">Rutina vacía. <Link className="text-accent" href={`/rutinas/${routine.id}`}>Añade ejercicios</Link></li>}
              <li className="pt-1 text-xs text-muted">{[...new Set(routine.exercises.map((e) => muscleLabel(e.primaryMuscle)))].join(" · ")}</li>
            </ul>
          )}

          {day.sessions.length > 0 && (
            <ul className="space-y-1">
              {day.sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/sesion/${s.id}`} className="text-sm text-good">✓ {s.name}{s.finished ? ` · ${s.durationMin} min · ${s.kcal} kcal` : " (en curso)"}</Link>
                </li>
              ))}
            </ul>
          )}
          {day.activities.map((a) => (
            <p key={a.id} className="text-sm text-good">✓ {activityEmoji(a.type)} {activityLabel(a.type)} · {a.durationMin} min · {a.kcal} kcal</p>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            {day.planned.kind === "workout" && routine && !open && (
              <form action={startWorkout.bind(null, routine.id, today)}>
                <Button>Empezar {routine.name}</Button>
              </form>
            )}
            {day.planned.kind !== "workout" && !open && (
              <form action={startWorkout.bind(null, null, today)}>
                <Button variant="secondary">Entrenar igualmente</Button>
              </form>
            )}
            <DayOverride date={today} current={day.planned} isOverride={day.planned.source === "override"} routines={routineOptions} />
          </div>

          {day.planned.kind === "activity" && day.activities.length === 0 && (
            <div className="border-t border-line pt-4">
              <p className="mb-3 text-sm font-semibold">Registrar {activityLabel(day.planned.activityType).toLowerCase()}</p>
              <ActivityForm today={today} bodyWeightKg={user.bodyWeightKg} defaultType={day.planned.activityType ?? "padel"} />
            </div>
          )}
        </div>
      </Card>

      {day.planned.source === "none" && day.planned.weekIndex === null && (
        <Card className="p-4 text-sm">
          Aún no tienes plan semanal. <Link href="/plan" className="font-semibold text-accent">Créalo aquí</Link> para que cada día te diga qué toca.
          {routines.length === 0 && <> Antes, <Link href="/rutinas" className="font-semibold text-accent">crea tus rutinas</Link>.</>}
        </Card>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Esta semana</h2>
          <Link href="/calendario" className="text-xs text-accent">Ver calendario</Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((x, i) => {
            const done = dayDone(x);
            return (
              <Link
                key={x.date}
                href={`/calendario?d=${x.date}`}
                className={cx("flex flex-col items-center gap-1 rounded-xl border py-2", x.date === today ? "border-accent" : "border-line", "bg-card")}
              >
                <span className="text-[11px] text-muted">{WEEKDAYS_SHORT[i]}</span>
                <span className="text-lg leading-none">{dayEmoji(x.planned)}</span>
                <span className={cx("h-1.5 w-1.5 rounded-full", done ? "bg-good" : x.date < today && x.planned.kind !== "rest" ? "bg-danger/60" : "bg-transparent")} />
              </Link>
            );
          })}
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {week.map((x, i) => (
            <li key={x.date} className={cx("flex justify-between gap-2", x.date === today && "font-semibold")}>
              <span className="text-muted">{WEEKDAYS[i]}</span>
              <span className="truncate">{dayTitle(x.planned)}{x.planned.label ? ` · ${x.planned.label}` : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Entrenos" value={`${sum.done}/${sum.planned}`} hint="hechos / plan" />
        <Stat label="Minutos" value={sum.minutes} />
        <Stat label="Kcal (est.)" value={sum.kcal.toLocaleString("es-ES")} />
      </section>

      {routines.length === 0 && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Empieza creando tu primera rutina.</p>
          <LinkButton href="/rutinas" size="sm">Crear rutina</LinkButton>
        </Card>
      )}
    </div>
  );
}
