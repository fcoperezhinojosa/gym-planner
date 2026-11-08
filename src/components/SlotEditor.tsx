"use client";

import { useState } from "react";
import { ACTIVITY_TYPES } from "@/lib/kcal";
import { MAX_EXTRA_ACTIVITIES, type DaySlot } from "@/lib/schedule";
import { Button, cx, input, label } from "./ui";

export type RoutineOption = { id: number; name: string; color: string };

const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_TYPES).filter(([k]) => k !== "gym");

/** Formulario para elegir qué se hace un día: rutina, actividad o descanso, más actividades extra. */
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
  const [extras, setExtras] = useState<string[]>(initial.extraActivities ?? []);
  const canAddExtra = kind !== "rest" && extras.length < MAX_EXTRA_ACTIVITIES;

  function addExtra() {
    const used = new Set([...extras, kind === "activity" ? activityType : ""]);
    const next = ACTIVITY_OPTIONS.find(([k]) => !used.has(k))?.[0] ?? "walking";
    setExtras([...extras, next]);
  }

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
            type="button"
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
            {ACTIVITY_OPTIONS.map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
      )}
      {kind !== "rest" && extras.length > 0 && (
        <div className="space-y-2">
          <p className={label}>Además, ese día</p>
          {extras.map((a, i) => (
            <div key={i} className="flex gap-2">
              <select
                aria-label={`Actividad extra ${i + 1}`}
                className={input}
                value={a}
                onChange={(e) => setExtras(extras.map((x, j) => (j === i ? e.target.value : x)))}
              >
                {ACTIVITY_OPTIONS.map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
              <Button type="button" variant="ghost" aria-label="Quitar actividad" onClick={() => setExtras(extras.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
      {canAddExtra && (
        <button type="button" onClick={addExtra} className="text-sm font-medium text-accent">
          + Añadir otra actividad ese día
        </button>
      )}
      <div>
        <label className={label} htmlFor="lbl">Nota (opcional)</label>
        <input id="lbl" className={input} value={text} placeholder={kind === "rest" ? "Ej.: descanso activo" : "Ej.: pecho bajo"} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        {onReset && <Button type="button" variant="ghost" onClick={onReset} disabled={pending}>{resetLabel ?? "Restablecer"}</Button>}
        <Button
          className="ml-auto"
          disabled={pending || (kind === "workout" && !routineId)}
          type="button"
          onClick={() =>
            onSave({
              kind,
              routineId: kind === "workout" ? routineId : null,
              activityType: kind === "activity" ? activityType : null,
              extraActivities: kind === "rest" ? [] : extras,
              label: text || null,
            })
          }
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
