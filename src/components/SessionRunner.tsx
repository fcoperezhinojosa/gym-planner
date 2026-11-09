"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { addExercisesToSession, deleteWorkout, finishWorkout, removeSessionExercise, saveSessionSets } from "@/app/actions";
import type { ExerciseLite, SessionDetail } from "@/lib/data";
import { INTENSITIES, estimateKcal, metFor, type Intensity } from "@/lib/kcal";
import { equipmentLabel, muscleLabel } from "@/lib/labels";
import { clearFinish, clearSets, pendingFinish, pendingSets, queueFinish, queueSets, type QueuedFinish } from "@/lib/offline-queue";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseThumb";
import { SetsEditor, type EditableSet } from "./SetsEditor";
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
  const [doneCount, setDoneCount] = useState(() => session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0));

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
        <Card className="sticky top-2 z-20 flex items-center justify-between gap-3 p-3 shadow-sm">
          <div>
            <p className="text-xs text-muted">Tiempo</p>
            <p className="text-xl font-bold tabular">{fmt(elapsed)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted">Series hechas</p>
            <p className="text-xl font-bold tabular">{doneCount}</p>
          </div>
          <Button onClick={() => setFinishing(true)}>Terminar</Button>
        </Card>
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

      {session.exercises.map((ex) => (
        <SessionExerciseCard
          key={ex.id}
          ex={ex}
          previous={previous[ex.exerciseId]}
          trackCompletion
          onCompleteSet={() => {
            setDoneCount((c) => c + 1);
            if (!finished && ex.restSeconds > 0) setRestUntil(Date.now() + ex.restSeconds * 1000);
          }}
          onUncomplete={() => setDoneCount((c) => Math.max(0, c - 1))}
          onRemove={() => confirm(`¿Quitar ${ex.name} de esta sesión?`) && start(() => removeSessionExercise(ex.id))}
        />
      ))}

      <Button variant="secondary" className="w-full" onClick={() => setPicker(true)}>+ Añadir ejercicio</Button>

      <div className="flex justify-end pt-2">
        <Button variant="danger" size="sm" onClick={() => confirm("¿Borrar esta sesión?") && start(() => deleteWorkout(session.id))}>
          Borrar sesión
        </Button>
      </div>

      {restUntil && restLeft > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-[min(92vw,26rem)] items-center justify-between rounded-2xl bg-fg px-4 py-3 text-bg shadow-lg md:bottom-6">
          <span className="text-sm">Descanso</span>
          <span className="text-2xl font-bold tabular">{fmt(restLeft)}</span>
          <div className="flex gap-1">
            <button className="rounded-lg px-2 py-1 text-sm hover:bg-bg/10" onClick={() => setRestUntil((r) => (r ?? Date.now()) + 15000)}>+15</button>
            <button className="rounded-lg px-2 py-1 text-sm hover:bg-bg/10" onClick={() => setRestUntil(null)}>Saltar</button>
          </div>
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
  previous,
  trackCompletion,
  onCompleteSet,
  onUncomplete,
  onRemove,
}: {
  ex: SessionDetail["exercises"][number];
  previous?: { date: string; sets: { reps: number; weightKg: number }[] };
  trackCompletion: boolean;
  onCompleteSet: () => void;
  onUncomplete: () => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState<EditableSet[]>(ex.sets);
  const { schedule, status } = useDebouncedSave(async (v: EditableSet[]) => {
    await saveSessionSets(ex.id, v);
    // Solo se borra la copia local si no ha cambiado mientras se enviaba.
    if (JSON.stringify(pendingSets(ex.id)) === JSON.stringify(v)) clearSets(ex.id);
  }, 400);

  // Si quedaron series sin enviar (sin cobertura), se recuperan de la copia local.
  useEffect(() => {
    const p = pendingSets(ex.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (p) setSets(p);
  }, [ex.id]);
  const allDone = sets.length > 0 && sets.every((s) => s.completed);

  return (
    <Card className={cx("p-4", allDone && "border-good/50")}>
      <div className="mb-3 flex items-start gap-3">
        <ExerciseThumb image={ex.image} muscle={ex.primaryMuscle} />
        <div className="min-w-0 flex-1">
          <Link href={`/ejercicios/${encodeURIComponent(ex.exerciseId)}`} className="block font-semibold leading-tight hover:text-accent">
            {ex.name}
          </Link>
          <p className="text-xs text-muted">
            {muscleLabel(ex.primaryMuscle)} · {equipmentLabel(ex.equipment)}
            {previous && <> · última vez {previous.date.split("-").reverse().slice(0, 2).join("/")}</>}
          </p>
          {status === "error" && <p className="text-xs text-danger">Sin conexión: guardado en el móvil, se enviará al volver la señal</p>}
        </div>
        <button onClick={onRemove} className="rounded-lg px-2 py-1 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Quitar ejercicio">✕</button>
      </div>
      <SetsEditor
        sets={sets}
        previous={previous?.sets}
        trackCompletion={trackCompletion}
        onComplete={onCompleteSet}
        onChange={(next) => {
          const before = sets.filter((s) => s.completed).length;
          const after = next.filter((s) => s.completed).length;
          if (after < before) onUncomplete();
          setSets(next);
          queueSets(ex.id, next);
          schedule(next);
        }}
      />
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
  const [pending, start] = useTransition();
  const kcal = estimateKcal(metFor("gym", intensity), bodyWeightKg, minutes);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div role="dialog" aria-label="Terminar entrenamiento" className="w-full max-w-md space-y-4 rounded-t-3xl bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
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
        <p className="text-sm text-muted">≈ <strong className="text-fg">{kcal} kcal</strong> estimadas con tu peso de {bodyWeightKg} kg</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Seguir</Button>
          <Button
            className="flex-[2]"
            disabled={pending}
            onClick={() => {
              const opts: QueuedFinish = hasExerciseChanges && hasRoutine
                ? { durationMin: minutes, intensity, notes, routineAction: routineAction === "keep" ? undefined : routineAction, newRoutineName: routineAction === "new" ? newRoutineName : undefined }
                : { durationMin: minutes, intensity, notes, updateRoutine };
              queueFinish(sessionId, opts);
              if (!navigator.onLine) return onQueued();
              start(async () => {
                try {
                  await syncSession(sessionId, exerciseIds);
                } catch {
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
