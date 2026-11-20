"use client";

import { useEffect, useState, useTransition } from "react";
import { ACTIVITY_TYPES, CARDIO_TYPES, INTENSITIES, estimateKcal, metFor, type Intensity } from "@/lib/kcal";
import { clearFinish, queueFinish, type QueuedFinish } from "@/lib/offline-queue";
import { clearPauseState } from "@/lib/session-timer";
import { toast } from "./Toast";
import { Button, cx, input, label } from "./ui";

export function FinishWorkoutDialog({
  sessionId,
  sync,
  onQueued,
  onFinished,
  hasRoutine,
  hasExerciseChanges,
  routineName,
  defaultMinutes,
  bodyWeightKg,
  onClose,
}: {
  sessionId: number;
  sync: () => Promise<void>;
  onQueued: () => void;
  onFinished: () => void;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  const activePill = "border-accent bg-accent-soft text-accent-ink font-semibold";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => !pending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Terminar entrenamiento"
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl border border-line bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold">Terminar entrenamiento</h2>
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
                className={cx("h-10 cursor-pointer rounded-xl border text-sm font-medium transition-colors", intensity === k ? activePill : "border-line")}
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

        <div className="space-y-3 rounded-xl border border-line bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">¿Has hecho o vas a hacer cardio?</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setHasCardio(false)}
                className={cx("h-8 cursor-pointer rounded-lg border px-3 text-xs font-medium transition-colors", !hasCardio ? activePill : "border-line")}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setHasCardio(true)}
                className={cx("h-8 cursor-pointer rounded-lg border px-3 text-xs font-medium transition-colors", hasCardio ? activePill : "border-line")}
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
                      className={cx("h-9 cursor-pointer rounded-xl border text-xs font-medium transition-colors", cardioIntensity === k ? activePill : "border-line")}
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
          <div className="space-y-2 rounded-xl border border-line bg-card p-3">
            <p className="text-sm font-medium">Los ejercicios han cambiado respecto a la rutina</p>
            {(["keep", "update", "new"] as const).map((opt) => (
              <label key={opt} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="routineAction"
                  value={opt}
                  checked={routineAction === opt}
                  onChange={() => setRoutineAction(opt)}
                  className="mt-0.5 accent-accent"
                />
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
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={updateRoutine}
              onChange={(e) => setUpdateRoutine(e.target.checked)}
              className="mt-1 accent-accent"
            />
            <span>Guardar los pesos y reps de hoy en la rutina (la próxima vez empiezas desde aquí)</span>
          </label>
        )}
        <p className="text-sm text-muted">
          ≈ <strong className="text-fg">{totalKcal} kcal</strong> estimadas con tu peso de {bodyWeightKg} kg
          {hasCardio && ` (${gymKcal} gym + ${cardioKcal} cardio)`}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={onClose}>
            Seguir
          </Button>
          <Button
            type="button"
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
                toast("Guardado en el móvil (se enviará con señal)", "neutral");
                return onQueued();
              }
              start(async () => {
                try {
                  await sync();
                  clearFinish(sessionId);
                  clearPauseState(sessionId);
                  toast(msg);
                  onFinished();
                } catch {
                  toast("Guardado en el móvil (se enviará con señal)", "neutral");
                  onQueued();
                }
              });
            }}
          >
            {pending ? "Guardando…" : "Guardar y terminar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
