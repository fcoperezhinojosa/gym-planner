"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
import type { ExerciseLite, RoutineDetail } from "@/lib/data";
import { equipmentLabel, muscleLabel } from "@/lib/labels";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseThumb";
import { SetsEditor, type EditableSet } from "./SetsEditor";
import { Button, Card, input } from "./ui";
import { useDebouncedSave } from "./useDebouncedSave";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#eab308", "#14b8a6", "#ef4444"];

export function RoutineEditor({ routine, exercises }: { routine: RoutineDetail; exercises: ExerciseLite[] }) {
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState(routine.name);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <input
          className={input + " text-base font-semibold"}
          value={name}
          aria-label="Nombre de la rutina"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== routine.name && start(() => updateRoutine(routine.id, { name }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Color ${c}`}
              onClick={() => start(() => updateRoutine(routine.id, { color: c }))}
              className="h-7 w-7 rounded-full"
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
          ex={ex}
          first={i === 0}
          last={i === routine.exercises.length - 1}
          onMove={(dir) => start(() => moveRoutineExercise(ex.id, dir))}
          onRemove={() => confirm(`¿Quitar ${ex.name}?`) && start(() => removeRoutineExercise(ex.id))}
        />
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" className="flex-1" onClick={() => setPicker(true)}>+ Añadir ejercicios</Button>
        <Button className="flex-1" disabled={pending || !routine.exercises.length} onClick={() => start(() => startWorkout(routine.id))}>
          Empezar entrenamiento
        </Button>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" size="sm" onClick={() => start(() => duplicateRoutine(routine.id))}>Duplicar</Button>
        <Button variant="danger" size="sm" onClick={() => confirm("¿Borrar la rutina? El historial de sesiones se mantiene.") && start(() => deleteRoutine(routine.id))}>
          Borrar rutina
        </Button>
      </div>

      {picker && (
        <ExercisePicker
          exercises={exercises}
          pending={pending}
          onClose={() => setPicker(false)}
          onConfirm={(ids) =>
            start(async () => {
              await addExercisesToRoutine(routine.id, ids);
              setPicker(false);
            })
          }
        />
      )}
    </div>
  );
}

function RoutineExerciseCard({
  ex,
  first,
  last,
  onMove,
  onRemove,
}: {
  ex: RoutineDetail["exercises"][number];
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState<EditableSet[]>(ex.sets);
  const [rest, setRest] = useState(ex.restSeconds);
  const { schedule, status } = useDebouncedSave((v: { sets: EditableSet[]; rest: number }) => saveRoutineSets(ex.id, v.sets, v.rest));

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start gap-3">
        <ExerciseThumb image={ex.image} muscle={ex.primaryMuscle} />
        <div className="min-w-0 flex-1">
          <Link href={`/ejercicios/${encodeURIComponent(ex.exerciseId)}`} className="block font-semibold leading-tight hover:text-accent">
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
              className="h-7 w-14 rounded-md border border-line bg-card-2 text-center tabular"
            />
            s
            <span className="ml-2 text-[11px]">{status === "saving" ? "Guardando…" : status === "error" ? "⚠ Error al guardar" : ""}</span>
          </label>
        </div>
        <div className="flex flex-col">
          <button disabled={first} onClick={() => onMove(-1)} className="rounded px-2 text-muted disabled:opacity-30" aria-label="Subir">▲</button>
          <button disabled={last} onClick={() => onMove(1)} className="rounded px-2 text-muted disabled:opacity-30" aria-label="Bajar">▼</button>
        </div>
        <button onClick={onRemove} className="rounded-lg px-2 py-1 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Quitar ejercicio">✕</button>
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
