"use client";

import { useState } from "react";
import { ACTIVITY_TYPES } from "@/lib/kcal";
import type { DaySlot } from "@/lib/schedule";
import { Button, cx, input, label } from "./ui";

export type RoutineOption = { id: number; name: string; color: string };

/** Formulario para elegir qué se hace un día: rutina, actividad o descanso. */
export function SlotEditor({
  initial,
  routines,
  onSave,
  onCancel,
  onReset,
  resetLabel,
  pending,
}: {
  initial: DaySlot;
  routines: RoutineOption[];
  onSave: (slot: DaySlot) => void;
  onCancel: () => void;
  onReset?: () => void;
  resetLabel?: string;
  pending?: boolean;
}) {
  const [kind, setKind] = useState(initial.kind);
  const [routineId, setRoutineId] = useState<number | null>(initial.routineId ?? routines[0]?.id ?? null);
  const [activityType, setActivityType] = useState(initial.activityType ?? "padel");
  const [text, setText] = useState(initial.label ?? "");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["workout", "🏋️ Gimnasio"],
            ["activity", "🎾 Actividad"],
            ["rest", "😴 Descanso"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cx("h-11 rounded-xl border text-sm font-medium", kind === k ? "border-accent bg-accent-soft text-accent" : "border-line")}
          >
            {l}
          </button>
        ))}
      </div>
      {kind === "workout" &&
        (routines.length ? (
          <div>
            <label className={label} htmlFor="routine">Rutina</label>
            <select id="routine" className={input} value={routineId ?? ""} onChange={(e) => setRoutineId(Number(e.target.value))}>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-muted">Primero crea una rutina en «Rutinas».</p>
        ))}
      {kind === "activity" && (
        <div>
          <label className={label} htmlFor="act">Actividad</label>
          <select id="act" className={input} value={activityType} onChange={(e) => setActivityType(e.target.value)}>
            {Object.entries(ACTIVITY_TYPES)
              .filter(([k]) => k !== "gym")
              .map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
          </select>
        </div>
      )}
      <div>
        <label className={label} htmlFor="lbl">Nota (opcional)</label>
        <input id="lbl" className={input} value={text} placeholder={kind === "rest" ? "Ej.: descanso activo" : "Ej.: pecho bajo"} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        {onReset && <Button variant="ghost" onClick={onReset} disabled={pending}>{resetLabel ?? "Restablecer"}</Button>}
        <Button
          className="ml-auto"
          disabled={pending || (kind === "workout" && !routineId)}
          onClick={() => onSave({ kind, routineId: kind === "workout" ? routineId : null, activityType: kind === "activity" ? activityType : null, label: text || null })}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
