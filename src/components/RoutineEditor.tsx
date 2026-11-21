"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  addExercisesToRoutine,
  deleteRoutine,
  duplicateRoutine,
  moveRoutineExercise,
  removeRoutineExercise,
  saveRoutineSets,
  startWorkout,
  updateRoutine,
} from "@/app/actions";
import type { RoutineDetail } from "@/lib/data";
import { equipmentLabel, muscleLabel } from "@/lib/labels";
import { isRedirectError, withBackParams } from "@/lib/navigation";
import { ConfirmDialog } from "./ConfirmDialog";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseThumb";
import { SetsEditor, type EditableSet } from "./SetsEditor";
import { toast } from "./Toast";
import { Button, Card, input } from "./ui";
import { useDebouncedSave } from "./useDebouncedSave";

const COLORS = ["#2f55f4", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#eab308", "#14b8a6", "#f97316", "#ef4444"];

export function RoutineEditor({ routine }: { routine: RoutineDetail }) {
  const [picker, setPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removingEx, setRemovingEx] = useState<{ id: number; name: string } | null>(null);
  const [pending, start] = useTransition();
  const [name, setName] = useState(routine.name);
  const cancelSavesRef = useRef(new Map<number, () => void>());

  const registerCancel = useCallback((reId: number, cancel: () => void) => {
    cancelSavesRef.current.set(reId, cancel);
    return () => {
      cancelSavesRef.current.delete(reId);
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <input
          className={input + " font-display text-base font-semibold"}
          value={name}
          aria-label="Nombre de la rutina"
          onChange={(e) => setName(e.target.value)}
          onBlur={() =>
            name.trim() &&
            name !== routine.name &&
            start(async () => {
              try {
                await updateRoutine(routine.id, { name });
                toast("Nombre de rutina guardado");
              } catch {
                toast("No se pudo guardar el nombre", "danger");
              }
            })
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => start(() => updateRoutine(routine.id, { color: c }))}
              className="h-7 w-7 cursor-pointer rounded-full transition-transform active:scale-95"
              style={{ background: c, outline: routine.color === c ? `3px solid ${c}55` : undefined, outlineOffset: 2 }}
            />
          ))}
        </div>
      </Card>

      {routine.exercises.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted">Añade ejercicios a la rutina. No hay límite.</Card>
      )}

      {routine.exercises.map((ex, i) => (
        <RoutineExerciseCard
          key={ex.id}
          routineId={routine.id}
          routineName={routine.name}
          ex={ex}
          first={i === 0}
          last={i === routine.exercises.length - 1}
          registerCancel={registerCancel}
          onMove={(dir) => start(() => moveRoutineExercise(ex.id, dir))}
          onRemove={() => setRemovingEx({ id: ex.id, name: ex.name })}
        />
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={() => setPicker(true)}>
          + Añadir ejercicios
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={pending || !routine.exercises.length}
          onClick={() =>
            start(async () => {
              try {
                await startWorkout(routine.id);
              } catch (err) {
                if (isRedirectError(err)) throw err;
                toast("No se pudo iniciar el entrenamiento", "danger");
              }
            })
          }
        >
          {pending ? "Abriendo…" : "Empezar entrenamiento"}
        </Button>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => start(() => duplicateRoutine(routine.id))}>
          Duplicar
        </Button>
        <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => setConfirmDelete(true)}>
          Borrar rutina
        </Button>
      </div>

      {picker && (
        <ExercisePicker
          pending={pending}
          onClose={() => setPicker(false)}
          onConfirm={(ids) =>
            start(async () => {
              try {
                await addExercisesToRoutine(routine.id, ids);
                setPicker(false);
                toast(ids.length === 1 ? "Ejercicio añadido a la rutina" : `${ids.length} ejercicios añadidos a la rutina`);
              } catch {
                toast("No se pudieron añadir los ejercicios", "danger");
              }
            })
          }
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`¿Borrar "${routine.name}"?`}
        description="El historial de sesiones anteriores se mantiene intacto."
        confirmLabel="Borrar rutina"
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          for (const cancel of cancelSavesRef.current.values()) cancel();
          start(async () => {
            try {
              await deleteRoutine(routine.id);
            } catch (err) {
              if (isRedirectError(err)) throw err;
              setConfirmDelete(false);
              toast("No se pudo borrar la rutina", "danger");
            }
          });
        }}
      />

      <ConfirmDialog
        open={removingEx !== null}
        title={removingEx ? `¿Quitar ${removingEx.name}?` : "¿Quitar ejercicio?"}
        description="Se eliminará de esta plantilla de rutina."
        confirmLabel="Quitar"
        pending={pending}
        onCancel={() => setRemovingEx(null)}
        onConfirm={() => {
          if (!removingEx) return;
          const target = removingEx;
          cancelSavesRef.current.get(target.id)?.();
          start(async () => {
            try {
              await removeRoutineExercise(target.id);
              setRemovingEx(null);
              toast(`${target.name} quitado`);
            } catch {
              toast("No se pudo quitar el ejercicio", "danger");
            }
          });
        }}
      />
    </div>
  );
}

function RoutineExerciseCard({
  routineId,
  routineName,
  ex,
  first,
  last,
  registerCancel,
  onMove,
  onRemove,
}: {
  routineId: number;
  routineName: string;
  ex: RoutineDetail["exercises"][number];
  first: boolean;
  last: boolean;
  registerCancel: (reId: number, cancel: () => void) => () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState<EditableSet[]>(ex.sets);
  const [rest, setRest] = useState(ex.restSeconds);
  const { schedule, cancel, status } = useDebouncedSave((v: { sets: EditableSet[]; rest: number }) => saveRoutineSets(ex.id, v.sets, v.rest));

  useEffect(() => registerCancel(ex.id, cancel), [ex.id, cancel, registerCancel]);

  const detailHref = withBackParams(
    `/ejercicios/${encodeURIComponent(ex.exerciseId)}`,
    `/rutinas/${routineId}`,
    routineName,
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start gap-3">
        <Link href={detailHref} className="shrink-0" aria-label={`Ver detalle de ${ex.name}`}>
          <ExerciseThumb image={ex.image} muscle={ex.primaryMuscle} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={detailHref} className="block font-semibold leading-tight transition-colors hover:text-accent-text">
            {ex.name}
          </Link>
          <p className="text-xs text-muted">{muscleLabel(ex.primaryMuscle)} · {equipmentLabel(ex.equipment)}</p>
          <label className="mt-1 flex items-center gap-1 text-xs text-muted">
            Descanso
            <input
              type="number"
              min={0}
              step={15}
              value={rest}
              onChange={(e) => {
                const r = Math.max(0, Number(e.target.value) || 0);
                setRest(r);
                schedule({ sets, rest: r });
              }}
              className="h-7 w-14 rounded-md border border-line bg-card-2 text-center tabular outline-none focus:border-accent"
            />
            s
            <span className="ml-2 text-[11px]">{status === "saving" ? "Guardando…" : status === "error" ? "⚠ Error al guardar" : ""}</span>
          </label>
        </div>
        <div className="flex flex-col">
          <button type="button" disabled={first} onClick={() => onMove(-1)} className="cursor-pointer rounded px-2 text-muted hover:text-fg disabled:cursor-default disabled:opacity-30" aria-label="Subir">
            ▲
          </button>
          <button type="button" disabled={last} onClick={() => onMove(1)} className="cursor-pointer rounded px-2 text-muted hover:text-fg disabled:cursor-default disabled:opacity-30" aria-label="Bajar">
            ▼
          </button>
        </div>
        <button type="button" onClick={onRemove} className="cursor-pointer rounded-lg px-2 py-1 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Quitar ejercicio">
          ✕
        </button>
      </div>
      <SetsEditor
        sets={sets}
        onChange={(s) => {
          setSets(s);
          schedule({ sets: s, rest });
        }}
      />
    </Card>
  );
}
