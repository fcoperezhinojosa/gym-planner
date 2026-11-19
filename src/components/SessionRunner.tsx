"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { addExercisesToSession, createRoutineFromSession, deleteWorkout, finishWorkout, removeSessionExercise, saveSessionSets, updateRoutineFromSession } from "@/app/actions";
import type { ExerciseLite, SessionDetail } from "@/lib/data";
import { ACTIVITY_TYPES, CARDIO_TYPES, INTENSITIES, estimateKcal, metFor, type Intensity } from "@/lib/kcal";
import { equipmentLabel, exerciseImage, muscleLabel } from "@/lib/labels";
import { clearFinish, clearSets, pendingFinish, pendingSets, queueFinish, queueSets, type QueuedFinish } from "@/lib/offline-queue";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseThumb";
import type { EditableSet } from "./SetsEditor";
import { SessionSets } from "./SessionSets";
import { toast } from "./Toast";
import { Button, Card, cx, input, label } from "./ui";
import { useDebouncedSave } from "./useDebouncedSave";

type Prev = Record<string, { date: string; sets: { reps: number; weightKg: number }[] }>;

/**
 * Envía lo que haya quedado en la cola local: primero las series pendientes y,
 * si se pidió terminar sin conexión, el cierre del entreno.
 * Lanza si no hay red (la cola se conserva para reintentar).
 */
async function syncSession(sessionId: number, exerciseIds: number[]) {
  for (const id of exerciseIds) {
    const p = pendingSets(id);
    if (!p) continue;
    await saveSessionSets(id, p);
    if (JSON.stringify(pendingSets(id)) === JSON.stringify(p)) clearSets(id);
  }
  const f = pendingFinish(sessionId);
  if (f) await finishWorkout(sessionId, f);
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Progress = { done: number; total: number; volume: number };

function progressOf(sets: { reps: number; weightKg: number; completed?: boolean }[]): Progress {
  const doneSets = sets.filter((s) => s.completed);
  return { done: doneSets.length, total: sets.length, volume: doneSets.reduce((a, s) => a + s.weightKg * s.reps, 0) };
}

const fmtKg = (n: number) => `${Math.round(n * 10) / 10} kg`;

export function SessionRunner({
  session,
  exercises,
  previous,
  bodyWeightKg,
  routineExerciseIds,
}: {
  session: SessionDetail;
  exercises: ExerciseLite[];
  previous: Prev;
  bodyWeightKg: number;
  routineExerciseIds: string[] | null;
}) {
  const finished = session.endedAt !== null;
  const sessionExerciseIds = session.exercises.map((e) => e.exerciseId);
  const hasExerciseChanges =
    !!routineExerciseIds && JSON.stringify(sessionExerciseIds) !== JSON.stringify(routineExerciseIds);
  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [progress, setProgress] = useState<Record<number, Progress>>(() =>
    Object.fromEntries(session.exercises.map((e) => [e.id, progressOf(e.sets)])),
  );
  // Ejercicio desplegado: por defecto el primero que aún tiene series pendientes.
  const [activeId, setActiveId] = useState<number | null>(() => {
    const firstOpen = session.exercises.find((e) => e.sets.some((s) => !s.completed));
    return (firstOpen ?? session.exercises[session.exercises.length - 1])?.id ?? null;
  });
  const totals = Object.values(progress).reduce(
    (a, p) => ({ done: a.done + p.done, total: a.total + p.total, volume: a.volume + p.volume }),
    { done: 0, total: 0, volume: 0 },
  );

  const [queuedFinish, setQueuedFinish] = useState(false);
  const exerciseIds = session.exercises.map((e) => e.id);
  const idsKey = exerciseIds.join(",");

  // Al volver la señal (o al abrir con señal) se envía lo pendiente.
  useEffect(() => {
    if (finished) {
      clearFinish(session.id);
      return;
    }
    // localStorage solo existe en el cliente: se lee tras hidratar para no desajustar el HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueuedFinish(pendingFinish(session.id) !== null);
    const run = () => {
      if (!navigator.onLine) return;
      syncSession(session.id, idsKey ? idsKey.split(",").map(Number) : []).catch(() => {});
    };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [finished, session.id, idsKey]);

  const restRef = useRef<number | null>(null);
  useEffect(() => {
    restRef.current = restUntil;
  }, [restUntil]);

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (restRef.current && restRef.current <= n) {
        restRef.current = null;
        setRestUntil(null);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [finished]);

  const elapsed = Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));
  const restLeft = restUntil ? Math.ceil((restUntil - now) / 1000) : 0;

  return (
    <div className="space-y-4">
      {!finished && (
        <div className="sticky top-0 z-20 -mx-4 border-b border-hoy-line bg-bg px-4 pb-3 pt-2">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Volver"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-hoy-surface text-hoy-ink"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-bold leading-tight text-hoy-ink">{session.name}</h1>
              <p className="flex items-center gap-1.5 text-[13px] text-hoy-muted">
                <span className="h-2 w-2 rounded-full bg-hoy-blue" />
                En curso
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFinishing(true)}
              className="h-11 shrink-0 rounded-full bg-hoy-blue px-[18px] text-[15px] font-bold text-white transition active:scale-[.98]"
            >
              Terminar
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <dt className="text-[13px] text-hoy-muted">Tiempo</dt>
              <dd className="font-display text-[22px] font-bold leading-tight tabular text-hoy-ink">{fmt(elapsed)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-hoy-muted">Volumen</dt>
              <dd className="font-display text-[22px] font-bold leading-tight tabular text-hoy-ink">{fmtKg(totals.volume)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-hoy-muted">Series</dt>
              <dd className="font-display text-[22px] font-bold leading-tight tabular text-hoy-ink">
                {totals.done}
                <span className="text-sm text-hoy-muted">/{totals.total}</span>
              </dd>
            </div>
          </dl>
          <div
            role="progressbar"
            aria-label="Series completadas"
            aria-valuemin={0}
            aria-valuemax={totals.total}
            aria-valuenow={totals.done}
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-hoy-track"
          >
            <div className="h-full rounded-full bg-hoy-blue transition-[width]" style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {queuedFinish && !finished && (
        <Card className="border-accent/50 p-3 text-sm">
          Entreno terminado y guardado en el móvil. Se enviará solo cuando vuelva la señal.
        </Card>
      )}

      {finished && (
        <Card className="grid grid-cols-3 gap-2 p-4 text-center">
          <div>
            <p className="text-xs text-muted">Duración</p>
            <p className="text-lg font-bold tabular">{session.durationMin} min</p>
          </div>
          <div>
            <p className="text-xs text-muted">Kcal (est.)</p>
            <p className="text-lg font-bold tabular">{session.kcal}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Intensidad</p>
            <p className="text-lg font-bold">{INTENSITIES[session.intensity as Intensity] ?? "—"}</p>
          </div>
        </Card>
      )}

      {finished && session.routineId && (
        <SaveRoutinePanel sessionId={session.id} routineName={session.name} hasChanges={hasExerciseChanges} />
      )}

      {session.exercises.map((ex, idx) => {
        const nextOpenId = session.exercises.find((e) => e.id !== activeId && (progress[e.id]?.done ?? 0) < (progress[e.id]?.total ?? 0))?.id;
        return (
          <SessionExerciseCard
            key={ex.id}
            ex={ex}
            index={idx}
            count={session.exercises.length}
            progress={progress[ex.id]}
            expanded={finished || ex.id === activeId}
            isNext={!finished && ex.id === nextOpenId && activeId !== null}
            previous={previous[ex.exerciseId]}
            onSelect={() => setActiveId(ex.id)}
            onSets={(sets) => {
              const p = progressOf(sets);
              setProgress((cur) => ({ ...cur, [ex.id]: p }));
              // Al terminar el ejercicio actual se pasa al siguiente con series pendientes.
              if (!finished && ex.id === activeId && p.total > 0 && p.done === p.total) {
                const after = session.exercises.slice(idx + 1).concat(session.exercises.slice(0, idx));
                const next = after.find((e) => (progress[e.id]?.done ?? 0) < (progress[e.id]?.total ?? 0));
                if (next) setActiveId(next.id);
              }
            }}
            onCompleteSet={() => {
              if (finished || ex.restSeconds <= 0) return;
              setRestTotal(ex.restSeconds);
              setRestUntil(Date.now() + ex.restSeconds * 1000);
            }}
            onRemove={() => confirm(`¿Quitar ${ex.name} de esta sesión?`) && start(() => removeSessionExercise(ex.id))}
          />
        );
      })}

      <Button variant="secondary" className="w-full" onClick={() => setPicker(true)}>+ Añadir ejercicio</Button>

      <div className="flex justify-end pt-2">
        <Button variant="danger" size="sm" onClick={() => confirm("¿Borrar esta sesión?") && start(() => deleteWorkout(session.id))}>
          Borrar sesión
        </Button>
      </div>

      {restUntil && restLeft > 0 && (
        <div
          role="timer"
          aria-label={`Descanso: quedan ${fmt(restLeft)}`}
          className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-[min(92vw,26rem)] items-center gap-3 rounded-3xl bg-hoy-navy py-3 pl-4 pr-3 text-white shadow-[0_16px_40px_rgba(16,26,61,0.30)] md:bottom-6"
        >
          <svg aria-hidden="true" width="52" height="52" viewBox="0 0 52 52" fill="none" className="shrink-0">
            <circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.14)" strokeWidth="5" />
            <circle
              cx="26"
              cy="26"
              r="22"
              stroke="#6C87FF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${Math.min(1, restLeft / Math.max(restTotal, restLeft, 1)) * 138.2} 138.2`}
              transform="rotate(-90 26 26)"
              className="transition-[stroke-dasharray] duration-1000 ease-linear"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold leading-tight tabular">{fmt(restLeft)}</p>
            <p className="text-xs text-hoy-periwinkle">Descanso</p>
          </div>
          <button
            type="button"
            className="h-11 rounded-full border border-white/20 px-3.5 text-sm font-semibold"
            onClick={() => {
              setRestTotal((t) => t + 15);
              setRestUntil((r) => (r ?? Date.now()) + 15000);
            }}
          >
            +15 s
          </button>
          <button type="button" className="h-11 rounded-full bg-white px-4 text-sm font-bold text-hoy-navy" onClick={() => setRestUntil(null)}>
            Saltar
          </button>
        </div>
      )}

      {picker && (
        <ExercisePicker
          exercises={exercises}
          pending={pending}
          onClose={() => setPicker(false)}
          onConfirm={(ids) =>
            start(async () => {
              await addExercisesToSession(session.id, ids);
              setPicker(false);
              toast(ids.length === 1 ? "Ejercicio añadido" : `${ids.length} ejercicios añadidos`);
            })
          }
        />
      )}

      {finishing && (
        <FinishDialog
          sessionId={session.id}
          exerciseIds={exerciseIds}
          onQueued={() => {
            setQueuedFinish(true);
            setFinishing(false);
          }}
          hasRoutine={session.routineId !== null}
          hasExerciseChanges={hasExerciseChanges}
          routineName={session.name}
          defaultMinutes={Math.max(1, Math.round(elapsed / 60))}
          bodyWeightKg={bodyWeightKg}
          onClose={() => setFinishing(false)}
        />
      )}
    </div>
  );
}

function SessionExerciseCard({
  ex,
  index,
  count,
  progress,
  expanded,
  isNext,
  previous,
  onSelect,
  onSets,
  onCompleteSet,
  onRemove,
}: {
  ex: SessionDetail["exercises"][number];
  index: number;
  count: number;
  progress?: Progress;
  expanded: boolean;
  isNext: boolean;
  previous?: { date: string; sets: { reps: number; weightKg: number }[] };
  onSelect: () => void;
  onSets: (sets: EditableSet[]) => void;
  onCompleteSet: () => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState<EditableSet[]>(ex.sets);
  const { schedule, status } = useDebouncedSave(async (v: EditableSet[]) => {
    await saveSessionSets(ex.id, v);
    // Solo se borra la copia local si no ha cambiado mientras se enviaba.
    if (JSON.stringify(pendingSets(ex.id)) === JSON.stringify(v)) clearSets(ex.id);
  }, 400);

  const onSetsRef = useRef(onSets);
  useEffect(() => {
    onSetsRef.current = onSets;
  });

  // Si quedaron series sin enviar (sin cobertura), se recuperan de la copia local.
  useEffect(() => {
    const p = pendingSets(ex.id);
    if (!p) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSets(p);
    onSetsRef.current(p);
  }, [ex.id]);

  const done = progress?.done ?? 0;
  const total = progress?.total ?? sets.length;
  const allDone = total > 0 && done === total;
  const src = exerciseImage(ex.image ?? undefined);
  const detailHref = `/ejercicios/${encodeURIComponent(ex.exerciseId)}`;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${ex.name}, ${allDone ? "hecho" : `${done} de ${total} series`}. Abrir`}
        className={cx(
          "flex w-full items-center gap-3 rounded-[20px] border p-3 text-left transition active:scale-[.99]",
          allDone ? "border-hoy-line bg-hoy-surface" : "border-hoy-line bg-card",
        )}
      >
        <ExerciseThumb image={ex.image} muscle={ex.primaryMuscle} className={cx("h-12 w-12 !rounded-[14px]", allDone && "opacity-60")} />
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[15px] font-semibold", allDone ? "text-hoy-muted line-through" : "text-hoy-ink")}>{ex.name}</span>
          <span className="block truncate text-[13px] text-hoy-muted">
            {done > 0 || allDone ? `${done}/${total} series` : `${total} series`}
            {progress && progress.volume > 0 && <> · {fmtKg(progress.volume)}</>}
            {isNext && !allDone && done === 0 && <> · siguiente</>}
          </span>
        </span>
        {allDone ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hoy-navy text-hoy-periwinkle">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        ) : (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-hoy-muted">
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <section
      aria-label={ex.name}
      className={cx("rounded-3xl border-[1.5px] bg-card p-3", allDone ? "border-hoy-line" : "border-hoy-blue")}
    >
      <Link
        href={detailHref}
        aria-label={`Cómo se hace ${ex.name}`}
        className="relative flex h-44 items-center justify-center overflow-hidden rounded-3xl bg-white"
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : (
          <ExerciseThumb image={null} muscle={ex.primaryMuscle} className="h-20 w-20" />
        )}
        <span className="absolute left-3 top-3 inline-flex h-7 items-center rounded-full bg-hoy-navy px-3 text-xs font-bold text-white">
          {index + 1} de {count}
        </span>
        <span className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full bg-card py-0 pl-[5px] pr-3.5 text-sm font-bold text-hoy-ink shadow-[0_2px_8px_rgba(14,21,48,0.15)]">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-hoy-blue text-white">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
          Cómo se hace
        </span>
      </Link>

      <div className="mb-3 mt-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[22px] font-bold leading-[1.15] text-hoy-ink">{ex.name}</h2>
          <p className="text-[13px] text-hoy-muted">
            {muscleLabel(ex.primaryMuscle)} · {equipmentLabel(ex.equipment)}
            {previous && <> · última vez {previous.date.split("-").reverse().slice(0, 2).join("/")}</>}
          </p>
          {status === "error" && <p className="text-xs text-danger">Sin conexión: guardado en el móvil, se enviará al volver la señal</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar ejercicio"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-hoy-line text-hoy-muted hover:bg-danger/10 hover:text-danger"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
          </svg>
        </button>
      </div>

      <SessionSets
        sets={sets}
        previous={previous?.sets}
        onComplete={onCompleteSet}
        onChange={(next) => {
          setSets(next);
          queueSets(ex.id, next);
          schedule(next);
          onSets(next);
        }}
      />
    </section>
  );
}

function SaveRoutinePanel({ sessionId, routineName, hasChanges }: { sessionId: number; routineName: string; hasChanges: boolean }) {
  const [mode, setMode] = useState<"idle" | "new">("idle");
  const [newName, setNewName] = useState(`${routineName} v2`);
  const [done, setDone] = useState<"updated" | "created" | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <Card className="p-4 text-sm text-good">
        {done === "updated" ? `Rutina "${routineName}" actualizada ✓` : `Nueva rutina "${newName}" creada ✓`}
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-medium">
        {hasChanges ? "Los ejercicios han cambiado respecto a la rutina" : "Guardar en la rutina"}
      </p>
      {mode === "idle" ? (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 text-sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await updateRoutineFromSession(sessionId);
                setDone("updated");
                toast(`Rutina "${routineName}" actualizada`);
              })
            }
          >
            Actualizar &ldquo;{routineName}&rdquo;
          </Button>
          <Button
            variant="secondary"
            className="flex-1 text-sm"
            disabled={pending}
            onClick={() => setMode("new")}
          >
            Crear nueva rutina
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className={input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 text-sm" onClick={() => setMode("idle")}>Cancelar</Button>
            <Button
              className="flex-1 text-sm"
              disabled={pending || !newName.trim()}
              onClick={() =>
                start(async () => {
                  await createRoutineFromSession(sessionId, newName);
                  setDone("created");
                  toast(`Nueva rutina "${newName.trim()}" creada`);
                })
              }
            >
              Guardar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function FinishDialog({
  sessionId,
  exerciseIds,
  onQueued,
  hasRoutine,
  hasExerciseChanges,
  routineName,
  defaultMinutes,
  bodyWeightKg,
  onClose,
}: {
  sessionId: number;
  exerciseIds: number[];
  onQueued: () => void;
  hasRoutine: boolean;
  hasExerciseChanges: boolean;
  routineName: string;
  defaultMinutes: number;
  bodyWeightKg: number;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [notes, setNotes] = useState("");
  const [updateRoutine, setUpdateRoutine] = useState(true);
  const [routineAction, setRoutineAction] = useState<"keep" | "update" | "new">("keep");
  const [newRoutineName, setNewRoutineName] = useState(`${routineName} v2`);
  const [hasCardio, setHasCardio] = useState(false);
  const [cardioType, setCardioType] = useState<string>("running");
  const [cardioMinutes, setCardioMinutes] = useState(20);
  const [cardioIntensity, setCardioIntensity] = useState<Intensity>("moderate");
  const [pending, start] = useTransition();
  const gymKcal = estimateKcal(metFor("gym", intensity), bodyWeightKg, minutes);
  const cardioKcal = hasCardio ? estimateKcal(metFor(cardioType, cardioIntensity), bodyWeightKg, cardioMinutes) : 0;
  const totalKcal = gymKcal + cardioKcal;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div role="dialog" aria-label="Terminar entrenamiento" className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Terminar entrenamiento</h2>
        <div>
          <label className={label} htmlFor="min">Duración (min)</label>
          <input id="min" type="number" min={1} className={input} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div>
          <span className={label}>Intensidad</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(INTENSITIES) as Intensity[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setIntensity(k)}
                className={cx("h-10 rounded-xl border text-sm font-medium", intensity === k ? "border-accent bg-accent-soft text-accent" : "border-line")}
              >
                {INTENSITIES[k]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="notes">Notas</label>
          <textarea id="notes" className={input + " h-20 py-2"} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="space-y-3 rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">¿Has hecho o vas a hacer cardio?</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setHasCardio(false)}
                className={cx("h-8 rounded-lg border px-3 text-xs font-medium", !hasCardio ? "border-accent bg-accent-soft text-accent" : "border-line")}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setHasCardio(true)}
                className={cx("h-8 rounded-lg border px-3 text-xs font-medium", hasCardio ? "border-accent bg-accent-soft text-accent" : "border-line")}
              >
                Sí
              </button>
            </div>
          </div>

          {hasCardio && (
            <div className="space-y-3 border-t border-line pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label} htmlFor="cardioType">Tipo de cardio</label>
                  <select id="cardioType" className={input} value={cardioType} onChange={(e) => setCardioType(e.target.value)}>
                    {CARDIO_TYPES.map((k) => {
                      const act = ACTIVITY_TYPES[k];
                      return (
                        <option key={k} value={k}>
                          {act.emoji} {act.label}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="cardioMin">Duración (min)</label>
                  <input
                    id="cardioMin"
                    type="number"
                    min={1}
                    className={input}
                    value={cardioMinutes}
                    onChange={(e) => setCardioMinutes(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>
              <div>
                <span className={label}>Intensidad del cardio</span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(INTENSITIES) as Intensity[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCardioIntensity(k)}
                      className={cx("h-9 rounded-xl border text-xs font-medium", cardioIntensity === k ? "border-accent bg-accent-soft text-accent" : "border-line")}
                    >
                      {INTENSITIES[k]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {hasRoutine && hasExerciseChanges && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-sm font-medium">Los ejercicios han cambiado respecto a la rutina</p>
            {(["keep", "update", "new"] as const).map((opt) => (
              <label key={opt} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="radio" name="routineAction" value={opt} checked={routineAction === opt} onChange={() => setRoutineAction(opt)} className="mt-0.5" />
                <span>
                  {opt === "keep" && "Dejar la rutina como estaba"}
                  {opt === "update" && `Actualizar "${routineName}" con los de hoy`}
                  {opt === "new" && "Crear nueva rutina"}
                </span>
              </label>
            ))}
            {routineAction === "new" && (
              <input
                className={cx(input, "mt-1")}
                value={newRoutineName}
                onChange={(e) => setNewRoutineName(e.target.value)}
                placeholder="Nombre de la nueva rutina"
                autoFocus
              />
            )}
          </div>
        )}
        {hasRoutine && !hasExerciseChanges && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={updateRoutine} onChange={(e) => setUpdateRoutine(e.target.checked)} className="mt-1" />
            <span>Guardar los pesos y reps de hoy en la rutina (la próxima vez empiezas desde aquí)</span>
          </label>
        )}
        <p className="text-sm text-muted">
          ≈ <strong className="text-fg">{totalKcal} kcal</strong> estimadas con tu peso de {bodyWeightKg} kg
          {hasCardio && ` (${gymKcal} gym + ${cardioKcal} cardio)`}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Seguir</Button>
          <Button
            className="flex-[2]"
            disabled={pending}
            onClick={() => {
              const cardio = hasCardio ? { type: cardioType, durationMin: cardioMinutes, intensity: cardioIntensity } : undefined;
              const opts: QueuedFinish = hasExerciseChanges && hasRoutine
                ? { durationMin: minutes, intensity, notes, routineAction: routineAction === "keep" ? undefined : routineAction, newRoutineName: routineAction === "new" ? newRoutineName : undefined, cardio }
                : { durationMin: minutes, intensity, notes, updateRoutine, cardio };
              const msg =
                hasRoutine && hasExerciseChanges
                  ? routineAction === "update"
                    ? `Entreno guardado y rutina "${routineName}" actualizada`
                    : routineAction === "new" && newRoutineName.trim()
                      ? `Entreno guardado y rutina "${newRoutineName.trim()}" creada`
                      : "Entrenamiento guardado"
                  : hasRoutine && updateRoutine
                    ? `Entreno y pesos guardados en "${routineName}"`
                    : "Entrenamiento guardado";
              queueFinish(sessionId, opts);
              if (!navigator.onLine) {
                toast("Guardado en el móvil (se enviará con señal)");
                return onQueued();
              }
              start(async () => {
                try {
                  toast(msg);
                  await syncSession(sessionId, exerciseIds);
                } catch {
                  toast("Guardado en el móvil (se enviará con señal)");
                  onQueued();
                }
              });
            }}
          >
            Guardar y terminar
          </Button>
        </div>
      </div>
    </div>
  );
}
