import Link from "next/link";
import { startWorkout } from "@/app/actions";
import { ActivityForm } from "@/components/ActivityForm";
import { dayEmoji, dayTitle } from "@/components/DayBadge";
import { DayOverride } from "@/components/DayOverride";
import { DeleteActivityButton } from "@/components/DeleteActivityButton";
import { DeleteWorkoutButton } from "@/components/DeleteWorkoutButton";
import { Button, Card, LinkButton, Pill, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCalendar, getOpenSession, getRoutine, listRoutineOptions } from "@/lib/data";
import { addDays, isoWeekday, startOfWeek, todayISO } from "@/lib/dates";
import { activityLabel } from "@/lib/kcal";
import { MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/labels";
import { weekLetter } from "@/lib/schedule";
import { dayDone, summarizeDays } from "@/lib/week";

const SEGMENT_COLORS = ["#1C1A17", "#C2501A", "#8A847B", "#2F6FB3", "#1F7A4C"];

const ICON = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

function DumbbellIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth} {...ICON}>
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </svg>
  );
}

function MoonIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...ICON}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" strokeWidth={3} {...ICON}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" strokeWidth={2.2} {...ICON}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="flex min-h-[108px] flex-col gap-1.5 rounded-[20px] p-3.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-display text-[32px] font-bold leading-none tabular">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );
}

export default async function TodayPage() {
  const user = await requireUser();
  const today = todayISO();
  const tomorrowDate = addDays(today, 1);
  const [calendar, open, routineOptions] = await Promise.all([
    getCalendar(user.id, startOfWeek(today), 8),
    getOpenSession(user.id),
    listRoutineOptions(user.id),
  ]);
  const week = calendar.slice(0, 7);
  const day = week.find((d) => d.date === today)!;
  const tomorrow = calendar.find((d) => d.date === tomorrowDate)!;
  // Camino al próximo entreno: días de descanso desde mañana hasta el siguiente día con algo planificado.
  const upcoming = calendar.filter((x) => x.date > today);
  const pathEndIdx = upcoming.findIndex((x) => x.planned.kind !== "rest");
  const pathEnd = pathEndIdx >= 0 ? upcoming[pathEndIdx] : undefined;
  const pathDays = pathEndIdx >= 0 ? upcoming.slice(0, pathEndIdx + 1) : upcoming;
  const pathStartsRest = tomorrow.planned.kind === "rest";
  const routine = day.planned.kind === "workout" && day.planned.routineId ? await getRoutine(user.id, day.planned.routineId) : null;
  const sum = summarizeDays(week, today);
  const [, m, d] = today.split("-").map(Number);
  const wd = week.findIndex((x) => x.date === today);

  const finishedSessions = day.sessions.filter((s) => s.finished);
  const done = dayDone(day);
  const items = [
    ...finishedSessions.map((s) => ({ key: `s-${s.id}`, kind: "session" as const, id: s.id, name: s.name, min: s.durationMin ?? 0, kcal: s.kcal ?? 0 })),
    ...day.activities.map((a) => ({ key: `a-${a.id}`, kind: "activity" as const, id: a.id, name: activityLabel(a.type), min: a.durationMin, kcal: a.kcal })),
  ];
  const totalKcal = items.reduce((acc, i) => acc + i.kcal, 0);
  const totalMin = items.reduce((acc, i) => acc + i.min, 0);
  const sets = routine ? routine.exercises.reduce((acc, e) => acc + e.sets.length, 0) : 0;
  const showTomorrow = done || tomorrow.planned.kind === "rest";

  const startForm = (variant: "hero" | "secondary") => {
    if (open) return null;
    if (day.planned.kind === "workout" && routine && (variant === "hero" || finishedSessions.length === 0))
      return (
        <form action={startWorkout.bind(null, routine.id, today)}>
          {variant === "hero" ? (
            <button
              type="submit"
              className="flex h-[60px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[18px] bg-[#C2501A] text-lg font-bold text-white transition hover:brightness-110 active:scale-[.98]"
            >
              <PlayIcon />
              Empezar {routine.name}
            </button>
          ) : (
            <Button variant="secondary" className="w-full">Empezar {routine.name}</Button>
          )}
        </form>
      );
    if (day.planned.kind !== "workout" && !done && variant === "hero")
      return (
        <form action={startWorkout.bind(null, null, today)}>
          <button
            type="submit"
            className="flex h-[60px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[18px] bg-[#C2501A] text-lg font-bold text-white transition hover:brightness-110 active:scale-[.98]"
          >
            <PlayIcon />
            Entrenar igualmente
          </button>
        </form>
      );
    return null;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1 px-1">
        <p className="text-sm text-muted">
          {WEEKDAYS[wd]}, {d} de {MONTHS[m - 1].toLowerCase()}
          {day.planned.weekIndex !== null && day.planned.source !== "none" && <> · Semana {weekLetter(day.planned.weekIndex)}</>}
        </p>
        <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-tight">Hola, {user.name.split(" ")[0]}</h1>
      </header>

      {open && (
        <Link href={`/sesion/${open.id}`} className="flex items-center justify-between rounded-[20px] bg-accent p-4 text-accent-fg">
          <span>
            <span className="block text-xs opacity-80">Entrenamiento en curso</span>
            <span className="font-semibold">{open.name}</span>
          </span>
          <span className="font-semibold">Continuar →</span>
        </Link>
      )}

      {done ? (
        <Card className="space-y-5 rounded-[28px] p-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-good/15 pl-2.5 pr-3 text-[13px] font-bold text-good">
              <CheckIcon />
              Hecho hoy
            </span>
            <span className="text-[13px] text-muted">
              {items.length} {items.length === 1 ? "actividad" : "actividades"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[88px] font-bold leading-[0.95] tracking-[-0.03em] tabular">{totalKcal.toLocaleString("es-ES")}</span>
              <span className="font-display text-2xl font-medium text-muted">kcal</span>
            </div>
            <p className="text-[15px] text-muted">quemadas hoy · {totalMin} min de actividad</p>
          </div>

          <div className="space-y-1">
            <div
              role="img"
              aria-label={`Reparto de kcal: ${items.map((i) => `${i.name} ${i.kcal}`).join(", ")}`}
              className="flex h-3 gap-[3px]"
            >
              {items.map((i, idx) => (
                <span
                  key={i.key}
                  className="min-w-1.5 rounded-md"
                  style={{ flex: `${Math.max(i.kcal, 1)} 1 0`, background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
                />
              ))}
            </div>
            <ul>
              {items.map((i, idx) => (
                <li key={i.key} className={cx("flex h-11 items-center gap-2.5", idx < items.length - 1 && "border-b border-line")}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }} />
                  {i.kind === "session" ? (
                    <Link href={`/sesion/${i.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{i.name}</Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-semibold">{i.name}</span>
                  )}
                  <span className="shrink-0 text-sm text-muted tabular">{i.min} min · {i.kcal} kcal</span>
                  {i.kind === "session" ? <DeleteWorkoutButton id={i.id} label={i.name} /> : <DeleteActivityButton id={i.id} label={i.name} />}
                </li>
              ))}
            </ul>
          </div>

          {startForm("secondary")}

          <details className="group">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line text-[15px] font-semibold transition hover:bg-card-2 [&::-webkit-details-marker]:hidden">
              <PlusIcon />
              Añadir actividad
            </summary>
            <div className="mt-3">
              <ActivityForm today={today} bodyWeightKg={user.bodyWeightKg} heightCm={user.heightCm} defaultType={day.planned.activityType ?? "other"} />
            </div>
          </details>
        </Card>
      ) : (
        <section
          aria-label="Entrenamiento de hoy"
          className="relative overflow-hidden rounded-[28px] border border-line bg-[#1C1A17] p-6 text-white"
        >
          <svg aria-hidden="true" width="260" height="260" viewBox="0 0 260 260" fill="none" className="absolute -right-[90px] -top-[90px]">
            <circle cx="130" cy="130" r="50" stroke="#fff" strokeOpacity="0.1" strokeWidth="2" />
            <circle cx="130" cy="130" r="80" stroke="#fff" strokeOpacity="0.08" strokeWidth="2" />
            <circle cx="130" cy="130" r="110" stroke="#fff" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="130" cy="130" r="128" stroke="#fff" strokeOpacity="0.04" strokeWidth="2" />
          </svg>

          <div className="relative space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[#D9D2C7]">
                <span className="h-2 w-2 rounded-full bg-[#E0559C]" />
                HOY TOCA
              </div>
              <h2 className="font-display text-[56px] font-bold leading-none tracking-[-0.02em] [overflow-wrap:anywhere]">
                {day.planned.kind === "rest" ? "Descanso" : dayTitle(day.planned)}
              </h2>
              {day.planned.label && <p className="text-sm text-[#D0C9BE]">{day.planned.label}</p>}
              {day.planned.source === "override" && <Pill className="bg-white/15 text-[#F3EEE6]">Cambiado solo hoy</Pill>}
            </div>

            {routine && (
              <>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/12 px-3 text-[13px] font-medium text-[#F3EEE6]">
                    <DumbbellIcon />
                    {routine.exercises.length} {routine.exercises.length === 1 ? "ejercicio" : "ejercicios"}
                  </span>
                  {sets > 0 && <span className="inline-flex h-8 items-center rounded-full bg-white/12 px-3 text-[13px] font-medium text-[#F3EEE6]">{sets} series</span>}
                </div>
                {routine.exercises.length > 0 ? (
                  <p className="text-[15px] leading-[1.45] text-[#D0C9BE] [text-wrap:pretty]">
                    {routine.exercises.slice(0, 3).map((e) => e.name).join(", ")}
                    {routine.exercises.length > 3 && ` y ${routine.exercises.length - 3} más`}
                  </p>
                ) : (
                  <p className="text-[15px] text-[#D0C9BE]">
                    Rutina vacía. <Link className="font-semibold text-white underline" href={`/rutinas/${routine.id}`}>Añade ejercicios</Link>
                  </p>
                )}
              </>
            )}

            {startForm("hero")}

            <div className="-mt-1 flex flex-wrap items-center justify-between gap-x-4 text-[#E9E2D7] [&_button]:text-[#E9E2D7] [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
              <DayOverride date={today} current={day.planned} isOverride={day.planned.source === "override"} routines={routineOptions} />
            </div>

            <details className="group border-t border-white/10 pt-2">
              <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-[#E9E2D7] [&::-webkit-details-marker]:hidden">
                <PlusIcon />
                Añadir actividad
              </summary>
              <div className="mt-2 rounded-2xl bg-card p-3 text-fg">
                <ActivityForm today={today} bodyWeightKg={user.bodyWeightKg} heightCm={user.heightCm} defaultType={day.planned.activityType ?? "other"} />
              </div>
            </details>
          </div>
        </section>
      )}

      {done && (
        <div className="-mt-2 flex flex-wrap items-center gap-2 px-1 [&:empty]:hidden">
          <DayOverride date={today} current={day.planned} isOverride={day.planned.source === "override"} routines={routineOptions} />
        </div>
      )}

      {day.planned.source === "none" && day.planned.weekIndex === null && (
        <Card className="rounded-[20px] p-4 text-sm">
          Aún no tienes plan semanal. <Link href="/plan" className="font-semibold text-accent">Créalo aquí</Link> para que cada día te diga qué toca.
          {routineOptions.length === 0 && <> Antes, <Link href="/rutinas" className="font-semibold text-accent">crea tus rutinas</Link>.</>}
        </Card>
      )}

      {showTomorrow && (
        <section aria-label="Camino al próximo entreno" className="space-y-3 rounded-[24px] border border-line bg-card-2/60 px-[18px] py-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-[17px] font-bold">{pathStartsRest ? "Toca recuperar" : "Mañana toca"}</h3>
            <p className="text-right text-[13px] text-muted">
              {pathEnd ? (
                <>
                  {pathStartsRest ? `${WEEKDAYS[isoWeekday(pathEnd.date) - 1]} vuelves con ` : ""}
                  <strong className="text-accent">{dayTitle(pathEnd.planned)}</strong>
                </>
              ) : (
                "Sin entreno planificado"
              )}
            </p>
          </div>

          <div className="flex items-center" aria-hidden="true">
            {pathDays.map((x, i) => {
              const last = i === pathDays.length - 1 && pathEnd !== undefined;
              return (
                <div key={x.date} className="contents">
                  {i > 0 && <span className="h-0 flex-1 border-t-2 border-dashed border-line" />}
                  <span
                    className={cx(
                      "flex flex-none items-center justify-center rounded-full",
                      last ? "h-12 w-12 bg-[#1C1A17] text-accent" : "h-10 w-10 border-[1.5px] border-line bg-card text-muted",
                    )}
                  >
                    {x.planned.kind === "rest" ? <MoonIcon /> : x.planned.kind === "workout" ? <DumbbellIcon size={22} strokeWidth={2.2} /> : <span className="text-lg leading-none">{dayEmoji(x.planned).slice(0, 2)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <ol className="flex justify-between text-xs font-semibold text-muted">
            {pathDays.map((x, i) => {
              const last = i === pathDays.length - 1 && pathEnd !== undefined;
              return (
                <li key={x.date} className={cx("text-center", last ? "w-12 text-fg" : "w-10")}>
                  {WEEKDAYS_SHORT[isoWeekday(x.date) - 1]}
                  <span className="sr-only">: {dayTitle(x.planned)}</span>
                </li>
              );
            })}
          </ol>

          {tomorrow.planned.kind === "rest" && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <DayOverride
                key={tomorrow.date}
                date={tomorrow.date}
                current={tomorrow.planned}
                isOverride={tomorrow.planned.source === "override"}
                routines={routineOptions}
                showAddActivity={true}
              />
            </div>
          )}
        </section>
      )}

      <section aria-label="Esta semana" className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display text-xl font-bold">Esta semana</h3>
          {!showTomorrow && (
            <Link href="/calendario" prefetch={true} className="inline-flex h-11 items-center text-sm font-semibold text-accent">Ver calendario</Link>
          )}
        </div>

        {!done && (
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((x, i) => {
              const isDone = dayDone(x);
              const isToday = x.date === today;
              const missed = !isDone && x.date < today && x.planned.kind !== "rest";
              return (
                <Link
                  key={x.date}
                  href={`/calendario?d=${x.date}`}
                  prefetch={true}
                  aria-label={`${WEEKDAYS[i]}: ${isDone ? "hecho" : dayTitle(x.planned)}`}
                  className={cx(
                    "flex flex-col items-center gap-2 rounded-2xl border-2 bg-card py-2.5",
                    isToday ? "border-[#C2501A]" : "border-line",
                  )}
                >
                  <span className={cx("text-xs", isToday ? "font-bold text-accent" : "font-semibold text-muted")}>{WEEKDAYS_SHORT[i]}</span>
                  <span
                    className={cx(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      isDone ? "bg-good/15 text-good" : isToday ? "text-accent" : missed ? "text-danger" : "text-muted",
                    )}
                  >
                    {isDone ? (
                      <CheckIcon />
                    ) : x.planned.kind === "rest" ? (
                      <MoonIcon />
                    ) : (
                      <span className="text-base leading-none" aria-hidden="true">{dayEmoji(x.planned).slice(0, 2)}</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Entrenos" value={`${sum.done}/${sum.planned}`} hint="hechos / plan" />
          <StatCard label="Minutos" value={sum.minutes} />
          <StatCard label="Kcal (est.)" value={sum.kcal.toLocaleString("es-ES")} />
        </div>
      </section>

      {routineOptions.length === 0 && (
        <Card className="flex items-center justify-between gap-3 rounded-[20px] p-4">
          <p className="text-sm">Empieza creando tu primera rutina.</p>
          <LinkButton href="/rutinas" size="sm">Crear rutina</LinkButton>
        </Card>
      )}
    </div>
  );
}
