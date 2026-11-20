"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { addExercisesToSession, deleteWorkout, finishWorkout, removeSessionExercise, saveSessionSets } from "@/app/actions";
import type { ExerciseLite, SessionDetail } from "@/lib/data";
import { INTENSITIES, type Intensity } from "@/lib/kcal";
import { equipmentLabel, exerciseImage, muscleLabel } from "@/lib/labels";
import { isRedirectError, withBackParams } from "@/lib/navigation";
import { clearFinish, clearSets, pendingFinish, pendingSets, queueSets } from "@/lib/offline-queue";
import {
  EMPTY_PAUSE,
  clearPauseState,
  computeElapsedSec,
  formatClock,
  pauseTimer,
  readPauseState,
  resumeTimer,
  writePauseState,
  type TimerPauseState,
} from "@/lib/session-timer";
import { ConfirmDialog } from "./ConfirmDialog";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseThumb";
import { FinishWorkoutDialog } from "./FinishWorkoutDialog";
import { SaveRoutinePanel } from "./SaveRoutinePanel";
import type { EditableSet } from "./SetsEditor";
import { SessionSets } from "./SessionSets";
import { toast } from "./Toast";
import { Button, Card, cx } from "./ui";
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
    const res = await saveSessionSets(id, p);
    if ((res && "missing" in res) || JSON.stringify(pendingSets(id)) === JSON.stringify(p)) {
      clearSets(id);
    }
  }
  const f = pendingFinish(sessionId);
  if (f) {
    await finishWorkout(sessionId, f);
    clearFinish(sessionId);
    clearPauseState(sessionId);
  }
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
  initialExerciseId = null,
}: {
  session: SessionDetail;
  exercises: ExerciseLite[];
  previous: Prev;
  bodyWeightKg: number;
  routineExerciseIds: string[] | null;
  initialExerciseId?: number | null;
}) {
  const finished = session.endedAt !== null;
  const sessionExerciseIds = session.exercises.map((e) => e.exerciseId);
  const hasExerciseChanges =
    !!routineExerciseIds && JSON.stringify(sessionExerciseIds) !== JSON.stringify(routineExerciseIds);
  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removingEx, setRemovingEx] = useState<{ id: number; name: string } | null>(null);
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [pauseState, setPauseState] = useState<TimerPauseState>(EMPTY_PAUSE);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restPausedMs, setRestPausedMs] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [localProgress, setLocalProgress] = useState<Record<number, Progress>>({});
  const cancelSavesRef = useRef(new Map<number, () => void>());

  const registerCancel = useCallback((seId: number, cancel: () => void) => {
    cancelSavesRef.current.set(seId, cancel);
    return () => {
      cancelSavesRef.current.delete(seId);
    };
  }, []);

  const getProgress = (e: SessionDetail["exercises"][number]): Progress => localProgress[e.id] ?? progressOf(e.sets);

  // Ejercicio desplegado: respeta el ?ex= al volver del detalle, o el primero con series pendientes.
  const [activeId, setActiveId] = useState<number | null>(() => {
    if (initialExerciseId && session.exercises.some((e) => e.id === initialExerciseId)) {
      return initialExerciseId;
    }
    const firstOpen = session.exercises.find((e) => e.sets.some((s) => !s.completed));
    return (firstOpen ?? session.exercises[session.exercises.length - 1])?.id ?? null;
  });

  // Si se borra el ejercicio activo, pasa automáticamente al siguiente abierto.
  const effectiveActiveId =
    activeId !== null && session.exercises.some((e) => e.id === activeId)
      ? activeId
      : (session.exercises.find((e) => {
          const p = getProgress(e);
          return p.done < p.total;
        }) ?? session.exercises[session.exercises.length - 1])?.id ?? null;

  // Totales derivados siempre de la lista actual de ejercicios (nunca queda desfasado al añadir/quitar).
  const totals = session.exercises.reduce(
    (a, e) => {
      const p = getProgress(e);
      return { done: a.done + p.done, total: a.total + p.total, volume: a.volume + p.volume };
    },
    { done: 0, total: 0, volume: 0 },
  );

  const [queuedFinish, setQueuedFinish] = useState(false);
  const exerciseIds = session.exercises.map((e) => e.id);
  const idsKey = exerciseIds.join(",");

  // Al montar en cliente, recuperar estado de pausa y cola pendiente.
  useEffect(() => {
    if (finished) {
      clearFinish(session.id);
      clearPauseState(session.id);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPauseState(readPauseState(session.id));
    setQueuedFinish(pendingFinish(session.id) !== null);
    const run = () => {
      if (!navigator.onLine) return;
      syncSession(session.id, idsKey ? idsKey.split(",").map(Number) : []).catch(() => {});
    };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [finished, session.id, idsKey]);

  const isPaused = pauseState.pausedAt !== null;
  const restRef = useRef<number | null>(null);
  useEffect(() => {
    restRef.current = restUntil;
  }, [restUntil]);

  useEffect(() => {
    if (finished || isPaused) return;
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
  }, [finished, isPaused]);

  const startedAtMs = new Date(session.startedAt).getTime();
  const elapsed = computeElapsedSec(startedAtMs, now, pauseState);
  const restLeft = restPausedMs !== null ? Math.ceil(restPausedMs / 1000) : restUntil ? Math.ceil((restUntil - now) / 1000) : 0;

  function togglePause() {
    const n = Date.now();
    setNow(n);
    if (isPaused) {
      const next = resumeTimer(pauseState, n);
      setPauseState(next);
      writePauseState(session.id, next);
      if (restPausedMs !== null && restPausedMs > 0) {
        setRestUntil(n + restPausedMs);
        setRestPausedMs(null);
      }
    } else {
      const next = pauseTimer(pauseState, n);
      setPauseState(next);
      writePauseState(session.id, next);
      if (restUntil && restUntil > n) {
        setRestPausedMs(restUntil - n);
        setRestUntil(null);
      }
    }
  }

  function handleDeleteSession() {
    // Cancelar cualquier autoguardado pendiente para no disparar saveSessionSets tras borrar.
    for (const cancel of cancelSavesRef.current.values()) cancel();
    clearFinish(session.id);
    clearPauseState(session.id);
    for (const e of session.exercises) clearSets(e.id);
    start(async () => {
      try {
        await deleteWorkout(session.id);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setConfirmDelete(false);
        toast("No se pudo borrar la sesión", "danger");
      }
    });
  }

  function handleRemoveExercise() {
    if (!removingEx) return;
    const target = removingEx;
    cancelSavesRef.current.get(target.id)?.();
    clearSets(target.id);
    start(async () => {
      try {
        await removeSessionExercise(target.id);
        setLocalProgress((cur) => {
          const next = { ...cur };
          delete next[target.id];
          return next;
        });
        setRemovingEx(null);
        toast(`${target.name} quitado`);
      } catch {
        toast("No se pudo quitar el ejercicio", "danger");
      }
    });
  }

  const nextOpenId = session.exercises.find((e) => {
    const p = getProgress(e);
    return e.id !== effectiveActiveId && p.done < p.total;
  })?.id;

  return (
    <div className="space-y-4">
      {!finished && (
        <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-bg/95 px-4 pb-3 pt-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Volver a Hoy"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface text-fg transition hover:bg-card-2"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-bold leading-tight text-fg">{session.name}</h1>
              <p className="flex items-center gap-1.5 text-[13px] text-muted">
                <span className={cx("h-2 w-2 rounded-full", isPaused ? "bg-warn" : "bg-accent")} />
                {isPaused ? "En pausa" : "En curso"}
              </p>
            </div>
            <button
              type="button"
              onClick={togglePause}
              aria-label={isPaused ? "Reanudar entrenamiento" : "Pausar entrenamiento"}
              title={isPaused ? "Reanudar" : "Pausar"}
              className={cx(
                "flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition active:scale-[.98]",
                isPaused ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-card text-fg hover:bg-surface",
              )}
            >
              {isPaused ? (
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              ) : (
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              )}
              <span className="hidden sm:inline">{isPaused ? "Reanudar" : "Pausar"}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Borrar sesión"
              title="Descartar sesión"
              disabled={pending}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            >
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setFinishing(true)}
              disabled={pending}
              className="h-11 shrink-0 cursor-pointer rounded-full bg-accent px-[18px] text-[15px] font-bold text-accent-fg transition hover:brightness-110 active:scale-[.98] disabled:opacity-50"
            >
              Terminar
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <dt className="text-[13px] text-muted">Tiempo</dt>
              <dd className={cx("font-display text-[22px] font-bold leading-tight tabular", isPaused ? "text-muted" : "text-fg")}>
                {formatClock(elapsed)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Volumen</dt>
              <dd className="font-display text-[22px] font-bold leading-tight tabular text-fg">{fmtKg(totals.volume)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Series</dt>
              <dd className="font-display text-[22px] font-bold leading-tight tabular text-fg">
                {totals.done}
                <span className="text-sm text-muted">/{totals.total}</span>
              </dd>
            </div>
          </dl>
          <div
            role="progressbar"
            aria-label="Series completadas"
            aria-valuemin={0}
            aria-valuemax={totals.total}
            aria-valuenow={totals.done}
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-card-2"
          >
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {!finished && isPaused && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn/35 bg-warn-soft px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-fg">Entrenamiento en pausa</p>
            <p className="text-xs text-muted">El cronómetro está detenido hasta que lo reanudes.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={togglePause}>
              Reanudar
            </Button>
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
            <p className="font-display text-lg font-bold tabular">{session.durationMin} min</p>
          </div>
          <div>
            <p className="text-xs text-muted">Kcal (est.)</p>
            <p className="font-display text-lg font-bold tabular">{session.kcal}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Intensidad</p>
            <p className="font-display text-lg font-bold">{INTENSITIES[session.intensity as Intensity] ?? "—"}</p>
          </div>
        </Card>
      )}

      {finished && session.routineId && (
        <SaveRoutinePanel sessionId={session.id} routineName={session.name} hasChanges={hasExerciseChanges} />
      )}

      {session.exercises.map((ex, idx) => {
        const p = getProgress(ex);
        return (
          <SessionExerciseCard
            key={ex.id}
            sessionId={session.id}
            sessionName={session.name}
            ex={ex}
            index={idx}
            count={session.exercises.length}
            progress={p}
            expanded={finished || ex.id === effectiveActiveId}
            isNext={!finished && ex.id === nextOpenId && effectiveActiveId !== null}
            previous={previous[ex.exerciseId]}
            registerCancel={registerCancel}
            onSelect={() => setActiveId(ex.id)}
            onSets={(sets) => {
              const nextP = progressOf(sets);
              setLocalProgress((cur) => ({ ...cur, [ex.id]: nextP }));
              // Al terminar el ejercicio actual se pasa al siguiente con series pendientes.
              if (!finished && ex.id === effectiveActiveId && nextP.total > 0 && nextP.done === nextP.total) {
                const after = session.exercises.slice(idx + 1).concat(session.exercises.slice(0, idx));
                const next = after.find((e) => {
                  const ep = getProgress(e);
                  return ep.done < ep.total;
                });
                if (next) setActiveId(next.id);
              }
            }}
            onCompleteSet={() => {
              if (finished || ex.restSeconds <= 0) return;
              setRestTotal(ex.restSeconds);
              if (isPaused) {
                setRestPausedMs(ex.restSeconds * 1000);
                setRestUntil(null);
              } else {
                setRestPausedMs(null);
                setRestUntil(Date.now() + ex.restSeconds * 1000);
              }
            }}
            onRemove={() => setRemovingEx({ id: ex.id, name: ex.name })}
          />
        );
      })}

      <Button type="button" variant="secondary" className="w-full" disabled={pending} onClick={() => setPicker(true)}>
        + Añadir ejercicio
      </Button>

      <div className="flex justify-end pt-2">
        <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => setConfirmDelete(true)}>
          Borrar sesión
        </Button>
      </div>

      {(restUntil || restPausedMs !== null) && restLeft > 0 && (
        <div
          role="timer"
          aria-label={`Descanso: quedan ${formatClock(restLeft)}`}
          className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-[min(92vw,26rem)] items-center gap-3 rounded-3xl bg-navy py-3 pl-4 pr-3 text-white shadow-[0_16px_40px_rgba(16,26,61,0.30)] md:bottom-6"
        >
          <svg aria-hidden="true" width="52" height="52" viewBox="0 0 52 52" fill="none" className="shrink-0">
            <circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.14)" strokeWidth="5" />
            <circle
              cx="26"
              cy="26"
              r="22"
              stroke="var(--periwinkle)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${Math.min(1, restLeft / Math.max(restTotal, restLeft, 1)) * 138.2} 138.2`}
              transform="rotate(-90 26 26)"
              className="transition-[stroke-dasharray] duration-1000 ease-linear"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold leading-tight tabular">{formatClock(restLeft)}</p>
            <p className="text-xs text-periwinkle">{restPausedMs !== null ? "Descanso (en pausa)" : "Descanso"}</p>
          </div>
          <button
            type="button"
            className="h-11 cursor-pointer rounded-full border border-white/20 px-3.5 text-sm font-semibold"
            onClick={() => {
              setRestTotal((t) => t + 15);
              if (restPausedMs !== null) setRestPausedMs((ms) => (ms ?? 0) + 15000);
              else setRestUntil((r) => (r ?? Date.now()) + 15000);
            }}
          >
            +15 s
          </button>
          <button
            type="button"
            className="h-11 cursor-pointer rounded-full bg-white px-4 text-sm font-bold text-navy"
            onClick={() => {
              setRestUntil(null);
              setRestPausedMs(null);
            }}
          >
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
              try {
                await addExercisesToSession(session.id, ids);
                setPicker(false);
                toast(ids.length === 1 ? "Ejercicio añadido" : `${ids.length} ejercicios añadidos`);
              } catch {
                toast("No se pudieron añadir los ejercicios", "danger");
              }
            })
          }
        />
      )}

      {finishing && (
        <FinishWorkoutDialog
          sessionId={session.id}
          sync={() => syncSession(session.id, exerciseIds)}
          onQueued={() => {
            setQueuedFinish(true);
            setFinishing(false);
          }}
          onFinished={() => {
            setQueuedFinish(false);
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

      <ConfirmDialog
        open={confirmDelete}
        title={finished ? "¿Borrar esta sesión?" : "¿Descartar este entrenamiento?"}
        description="Se eliminarán todas las series registradas en esta sesión. Esta acción no se puede deshacer."
        confirmLabel={finished ? "Borrar sesión" : "Descartar"}
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDeleteSession}
      />

      <ConfirmDialog
        open={removingEx !== null}
        title={removingEx ? `¿Quitar ${removingEx.name}?` : "¿Quitar ejercicio?"}
        description="Solo se quitará de esta sesión."
        confirmLabel="Quitar"
        pending={pending}
        onCancel={() => setRemovingEx(null)}
        onConfirm={handleRemoveExercise}
      />
    </div>
  );
}

function SessionExerciseCard({
  sessionId,
  sessionName,
  ex,
  index,
  count,
  progress,
  expanded,
  isNext,
  previous,
  registerCancel,
  onSelect,
  onSets,
  onCompleteSet,
  onRemove,
}: {
  sessionId: number;
  sessionName: string;
  ex: SessionDetail["exercises"][number];
  index: number;
  count: number;
  progress: Progress;
  expanded: boolean;
  isNext: boolean;
  previous?: { date: string; sets: { reps: number; weightKg: number }[] };
  registerCancel: (seId: number, cancel: () => void) => () => void;
  onSelect: () => void;
  onSets: (sets: EditableSet[]) => void;
  onCompleteSet: () => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState<EditableSet[]>(ex.sets);
  const { schedule, cancel, status } = useDebouncedSave(async (v: EditableSet[]) => {
    const res = await saveSessionSets(ex.id, v);
    if ((res && "missing" in res) || JSON.stringify(pendingSets(ex.id)) === JSON.stringify(v)) {
      clearSets(ex.id);
    }
  }, 400);

  useEffect(() => registerCancel(ex.id, cancel), [ex.id, cancel, registerCancel]);

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

  const done = progress.done;
  const total = progress.total;
  const allDone = total > 0 && done === total;
  const src = exerciseImage(ex.image ?? undefined);
  const detailHref = withBackParams(
    `/ejercicios/${encodeURIComponent(ex.exerciseId)}`,
    `/sesion/${sessionId}?ex=${ex.id}`,
    sessionName,
  );

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${ex.name}, ${allDone ? "hecho" : `${done} de ${total} series`}. Abrir`}
        className={cx(
          "flex w-full cursor-pointer items-center gap-3 rounded-[20px] border p-3 text-left transition active:scale-[.99]",
          allDone ? "border-line bg-surface" : "border-line bg-card hover:border-accent/50",
        )}
      >
        <ExerciseThumb image={ex.image} muscle={ex.primaryMuscle} className={cx("h-12 w-12 !rounded-[14px]", allDone && "opacity-60")} />
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[15px] font-semibold", allDone ? "text-muted line-through" : "text-fg")}>{ex.name}</span>
          <span className="block truncate text-[13px] text-muted">
            {done > 0 || allDone ? `${done}/${total} series` : `${total} series`}
            {progress.volume > 0 && <> · {fmtKg(progress.volume)}</>}
            {isNext && !allDone && done === 0 && <> · siguiente</>}
          </span>
        </span>
        {allDone ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-periwinkle">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        ) : (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <section
      aria-label={ex.name}
      className={cx("rounded-3xl border-[1.5px] bg-card p-3", allDone ? "border-line" : "border-accent")}
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
        <span className="absolute left-3 top-3 inline-flex h-7 items-center rounded-full bg-navy px-3 text-xs font-bold text-white">
          {index + 1} de {count}
        </span>
        <span className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full bg-card py-0 pl-[5px] pr-3.5 text-sm font-bold text-fg shadow-[0_2px_8px_rgba(14,21,48,0.15)]">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent text-accent-fg">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
          Cómo se hace
        </span>
      </Link>

      <div className="mb-3 mt-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[22px] font-bold leading-[1.15] text-fg">{ex.name}</h2>
          <p className="text-[13px] text-muted">
            {muscleLabel(ex.primaryMuscle)} · {equipmentLabel(ex.equipment)}
            {previous && <> · última vez {previous.date.split("-").reverse().slice(0, 2).join("/")}</>}
          </p>
          {status === "error" && <p className="text-xs text-danger">Sin conexión: guardado en el móvil, se enviará al volver la señal</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar ejercicio"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-line text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
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
