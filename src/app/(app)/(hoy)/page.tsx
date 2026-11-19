import Link from "next/link";
import { startWorkout } from "@/app/actions";
import { ActivityForm } from "@/components/ActivityForm";
import { AddActivityToggle } from "@/components/AddActivityToggle";
import { dayEmoji, dayTitle } from "@/components/DayBadge";
import { DayOverride } from "@/components/DayOverride";
import { DeleteActivityButton } from "@/components/DeleteActivityButton";
import { DeleteWorkoutButton } from "@/components/DeleteWorkoutButton";
import { Card, LinkButton, Pill, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCalendar, getOpenSession, getRoutine, listRoutineOptions } from "@/lib/data";
import { startOfWeek, todayISO } from "@/lib/dates";
import { activityLabel } from "@/lib/kcal";
import { MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/labels";
import { weekLetter } from "@/lib/schedule";
import { dayDone, summarizeDays } from "@/lib/week";

// Reparto de kcal por actividad (la primera es la más oscura).
const SEGMENT_COLORS = ["var(--hoy-navy)", "var(--hoy-blue)", "var(--hoy-periwinkle)", "#2a78d6", "#1f7a4c"];

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

function CheckIcon({ size = 16, strokeWidth = 3 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth} {...ICON}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...ICON}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

const RING_R = 130;
const RING_C = 2 * Math.PI * RING_R;
const RING_GAP = 14;

type RingSegment = { color: string; opacity?: number };

/** Anillo del día: un tramo por actividad de hoy, con el mismo color que su fila en el listado. */
function DayRing({ segments, size, label, children }: { segments: RingSegment[]; size: number; label: string; children: React.ReactNode }) {
  const n = Math.max(segments.length, 1);
  const gap = n > 1 ? RING_GAP : 0;
  const seg = RING_C / n - gap;
  return (
    <div className="relative mx-auto mt-2 shrink-0" style={{ width: size, height: size }}>
      <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 300 300" fill="none" className="absolute inset-0">
        <circle cx="150" cy="150" r="114" fill="var(--hoy-navy)" />
        {(segments.length ? segments : [{ color: "var(--hoy-track)" }]).map((sg, i) => (
          <circle
            key={i}
            cx="150"
            cy="150"
            r={RING_R}
            stroke={sg.color}
            strokeOpacity={sg.opacity ?? 1}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${seg} ${RING_C}`}
            strokeDashoffset={-(i * (seg + gap) + gap / 2)}
            transform="rotate(-90 150 150)"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-10 text-center">{children}</div>
    </div>
  );
}

function heroTitleSize(title: string) {
  if (title.length <= 5) return "text-[60px]";
  if (title.length <= 8) return "text-[40px]";
  if (title.length <= 14) return "text-[28px]";
  return "text-[22px]";
}

export default async function TodayPage() {
  const user = await requireUser();
  const today = todayISO();
  const [calendar, open, routineOptions] = await Promise.all([
    getCalendar(user.id, startOfWeek(today), 8),
    getOpenSession(user.id),
    listRoutineOptions(user.id),
  ]);
  const week = calendar.slice(0, 7);
  const day = week.find((d) => d.date === today)!;
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
  const heroTitle = day.planned.kind === "rest" ? "Descanso" : dayTitle(day.planned);
  const plannedToday = day.planned.kind === "rest" ? 0 : 1 + (day.planned.extraActivities?.length ?? 0);
  const doneSegments: RingSegment[] = [
    ...items.map((_, idx) => ({ color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] })),
    // Lo planificado hoy que aún no está hecho, en gris.
    ...Array.from({ length: Math.max(plannedToday - items.length, 0) }, () => ({ color: "var(--hoy-track)" })),
  ];
  const todoSegments: RingSegment[] = Array.from({ length: plannedToday }, (_, idx) => ({ color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length], opacity: 0.4 }));

  const activityForm = <ActivityForm today={today} bodyWeightKg={user.bodyWeightKg} heightCm={user.heightCm} defaultType={day.planned.activityType ?? "other"} />;

  const canStartRoutine = !open && day.planned.kind === "workout" && routine !== null;
  const canStartFree = !open && day.planned.kind !== "workout" && !done;

  return (
    <div className="relative space-y-5 overflow-x-clip">
      {/* Resplandor tras el anillo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[250px] -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(47,85,244,0.12) 0%, rgba(47,85,244,0.06) 40%, rgba(47,85,244,0) 65%)" }}
      />

      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-hoy-muted">
            {WEEKDAYS[wd]}, {d} de {MONTHS[m - 1].toLowerCase()}
          </p>
          <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-tight">
            {done ? "Buen trabajo" : "Hola"}, {user.name.split(" ")[0]}
          </h1>
        </div>
        {day.planned.weekIndex !== null && day.planned.source !== "none" && (
          <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-hoy-line px-3 text-xs font-semibold text-hoy-muted">
            Semana {weekLetter(day.planned.weekIndex)}
          </span>
        )}
      </header>

      {open && (
        <Link href={`/sesion/${open.id}`} className="flex items-center justify-between rounded-[20px] bg-hoy-blue p-4 text-white">
          <span>
            <span className="block text-xs opacity-80">Entrenamiento en curso</span>
            <span className="font-semibold">{open.name}</span>
          </span>
          <span className="font-semibold">Continuar →</span>
        </Link>
      )}

      {done ? (
        <>
          <DayRing segments={doneSegments} size={280} label={`Hoy: ${items.map((i) => i.name).join(", ")}`}>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.16em] text-hoy-periwinkle">
              <CheckIcon size={14} />
              HECHO HOY
            </span>
            <span className="font-display text-[68px] font-bold leading-none tracking-[-0.03em] text-white tabular">{totalKcal.toLocaleString("es-ES")}</span>
            <span className="text-sm text-[#c5ceea]">kcal · {totalMin} min</span>
          </DayRing>

          <section aria-label="Actividad de hoy" className="flex flex-wrap items-center justify-between gap-x-3 rounded-[20px] border border-hoy-line bg-hoy-surface px-4 pb-1.5 pt-3.5">
            <h2 className="font-display text-[17px] font-bold">Hoy has hecho</h2>
            <AddActivityToggle className="text-hoy-blue" label={<><PlusIcon />Añadir</>}>{activityForm}</AddActivityToggle>
            <div
              role="img"
              aria-label={`Reparto de kcal: ${items.map((i) => `${i.name} ${i.kcal}`).join(", ")}`}
              className="mb-0.5 flex h-2 w-full gap-[3px]"
            >
              {items.map((i, idx) => (
                <span
                  key={i.key}
                  className="min-w-1.5 rounded"
                  style={{ flex: `${Math.max(i.kcal, 1)} 1 0`, background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
                />
              ))}
            </div>
            <ul className="w-full">
              {items.map((i, idx) => (
                <li key={i.key} className={cx("flex h-[42px] items-center gap-2.5", idx < items.length - 1 && "border-b border-hoy-line")}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }} />
                  {i.kind === "session" ? (
                    <Link href={`/sesion/${i.id}`} className="min-w-0 flex-1 truncate text-[15px] font-semibold hover:underline">{i.name}</Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{i.name}</span>
                  )}
                  <span className="shrink-0 text-sm text-hoy-muted tabular">{i.min} min · {i.kcal} kcal</span>
                  {i.kind === "session" ? <DeleteWorkoutButton id={i.id} label={i.name} /> : <DeleteActivityButton id={i.id} label={i.name} />}
                </li>
              ))}
            </ul>
          </section>

          {canStartRoutine && finishedSessions.length === 0 && routine && (
            <form action={startWorkout.bind(null, routine.id, today)}>
              <button
                type="submit"
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] border-hoy-line bg-card text-[15px] font-semibold transition hover:bg-hoy-surface"
              >
                <PlayIcon />
                Empezar {routine.name}
              </button>
            </form>
          )}
          <div className="-mt-2 flex flex-wrap items-center justify-center gap-x-6 text-hoy-muted [&>button]:h-11 [&>button]:rounded-lg [&>button]:text-sm [&>button]:font-semibold [&>button]:text-hoy-muted">
            <DayOverride date={today} current={day.planned} isOverride={day.planned.source === "override"} routines={routineOptions} dayLabel="hoy" hoy />
          </div>
        </>
      ) : (
        <>
          <DayRing segments={todoSegments} size={300} label={`Hoy toca: ${heroTitle}`}>
            <span className="text-xs font-semibold tracking-[0.16em] text-hoy-periwinkle">HOY TOCA</span>
            <span className={cx("font-display font-bold leading-none tracking-[-0.02em] text-white [overflow-wrap:anywhere]", heroTitleSize(heroTitle))}>
              {heroTitle}
            </span>
            {routine && routine.exercises.length > 0 && (
              <span className="text-sm text-[#c5ceea]">
                {routine.exercises.length} {routine.exercises.length === 1 ? "ejercicio" : "ejercicios"}
                {sets > 0 && <> · {sets} series</>}
              </span>
            )}
            {day.planned.label && <span className="text-sm text-[#c5ceea]">{day.planned.label}</span>}
            {day.planned.source === "override" && <Pill className="bg-white/15 text-[#e4e9ff]">Cambiado solo hoy</Pill>}
          </DayRing>

          <div className="space-y-1">
            {canStartRoutine && routine && (
              <form action={startWorkout.bind(null, routine.id, today)}>
                <button
                  type="submit"
                  className="flex h-16 w-full cursor-pointer items-center justify-between rounded-full bg-hoy-blue pl-6 pr-2.5 text-lg font-bold text-white transition hover:brightness-110 active:scale-[.99]"
                >
                  <span className="truncate">Empezar {routine.name}</span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#2f55f4]">
                    <PlayIcon />
                  </span>
                </button>
              </form>
            )}
            {canStartFree && (
              <form action={startWorkout.bind(null, null, today)}>
                <button
                  type="submit"
                  className="flex h-16 w-full cursor-pointer items-center justify-between rounded-full bg-hoy-blue pl-6 pr-2.5 text-lg font-bold text-white transition hover:brightness-110 active:scale-[.99]"
                >
                  Entrenar igualmente
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#2f55f4]">
                    <PlayIcon />
                  </span>
                </button>
              </form>
            )}
            {routine && routine.exercises.length === 0 && (
              <p className="px-1 pb-1 text-center text-sm text-hoy-muted">
                Rutina vacía. <Link className="font-semibold text-hoy-blue" href={`/rutinas/${routine.id}`}>Añade ejercicios</Link>
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-6 [&>button]:h-11 [&>button]:rounded-lg [&>button]:text-sm [&>button]:font-semibold [&>button]:text-hoy-muted">
              <DayOverride date={today} current={day.planned} isOverride={day.planned.source === "override"} routines={routineOptions} dayLabel="hoy" hoy />
              <AddActivityToggle className="text-hoy-muted">{activityForm}</AddActivityToggle>
            </div>
          </div>
        </>
      )}

      {day.planned.source === "none" && day.planned.weekIndex === null && (
        <Card className="rounded-[20px] p-4 text-sm">
          Aún no tienes plan semanal. <Link href="/plan" className="font-semibold text-hoy-blue">Créalo aquí</Link> para que cada día te diga qué toca.
          {routineOptions.length === 0 && <> Antes, <Link href="/rutinas" className="font-semibold text-hoy-blue">crea tus rutinas</Link>.</>}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex h-[140px] flex-col justify-between rounded-[26px] bg-hoy-tint p-[18px]">
          <span className="text-[13px] font-semibold text-hoy-tint-ink">Esta semana</span>
          <div className="space-y-2.5">
            <span className="font-display text-[44px] font-bold leading-none tabular">
              {sum.done}
              <span className="text-2xl text-hoy-tint-ink opacity-80">/{sum.planned}</span>
            </span>
            <span role="img" aria-label={`${sum.done} de ${sum.planned} entrenos hechos`} className="flex gap-[5px]">
              {Array.from({ length: Math.max(sum.planned, 1) }, (_, i) => (
                <span key={i} className={cx("h-2 flex-1 rounded", i < sum.done ? "bg-hoy-navy" : "bg-hoy-track")} />
              ))}
            </span>
          </div>
        </div>
        <div className="flex h-[140px] flex-col justify-between rounded-[26px] bg-hoy-mint p-[18px]">
          <span className="text-[13px] font-semibold text-hoy-mint-ink">Kcal semana</span>
          <div className="space-y-0.5">
            <span className="block font-display text-[44px] font-bold leading-none tabular">{sum.kcal.toLocaleString("es-ES")}</span>
            <span className="block text-[13px] text-hoy-mint-ink">{sum.minutes} min entrenados</span>
          </div>
        </div>
      </div>

      {!done && (
        <section aria-label="Plan de la semana" className="space-y-3.5 rounded-3xl border border-hoy-line bg-hoy-surface px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[17px] font-bold">Plan de la semana</h2>
            <Link href="/calendario" prefetch={true} className="-my-3.5 inline-flex h-11 items-center text-[13px] font-semibold text-hoy-blue">Ver calendario</Link>
          </div>
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-x-[17px] top-4 h-0 border-t-2 border-dashed border-hoy-line" />
            <div className="relative flex justify-between">
              {week.map((x, i) => {
                const isDone = dayDone(x);
                const isToday = x.date === today;
                return (
                  <Link
                    key={x.date}
                    href={`/calendario?d=${x.date}`}
                    prefetch={true}
                    aria-label={`${WEEKDAYS[i]}: ${isDone ? "hecho" : dayTitle(x.planned)}`}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cx(
                        "flex h-[34px] w-[34px] items-center justify-center rounded-full",
                        isDone
                          ? "bg-hoy-navy text-hoy-periwinkle"
                          : isToday && x.planned.kind !== "rest"
                            ? "bg-hoy-blue text-white shadow-[0_0_0_4px_var(--hoy-tint)]"
                            : "border-[1.5px] border-hoy-line bg-card text-hoy-muted/70",
                      )}
                    >
                      {isDone ? <CheckIcon size={15} /> : x.planned.kind === "rest" ? <MoonIcon size={15} /> : x.planned.kind === "workout" ? <DumbbellIcon size={17} strokeWidth={2.2} /> : <span className="text-sm leading-none" aria-hidden="true">{dayEmoji(x.planned).slice(0, 2)}</span>}
                    </span>
                    <span className={cx("text-xs", isToday ? "font-bold text-hoy-blue" : "font-semibold text-hoy-muted")}>{WEEKDAYS_SHORT[i]}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {routineOptions.length === 0 && (
        <Card className="flex items-center justify-between gap-3 rounded-[20px] p-4">
          <p className="text-sm">Empieza creando tu primera rutina.</p>
          <LinkButton href="/rutinas" size="sm">Crear rutina</LinkButton>
        </Card>
      )}
    </div>
  );
}
