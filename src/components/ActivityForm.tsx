"use client";

import { useActionState, useContext, useEffect, useState } from "react";
import { logActivity } from "@/app/actions";
import {
  ACTIVITY_TYPES,
  INTENSITIES,
  estimateKcal,
  estimateWalkingKcalFromKm,
  metFor,
  stepsToKm,
  walkingDurationMin,
  type Intensity,
} from "@/lib/kcal";
import { CloseAddActivityContext } from "./AddActivityContext";
import { toast } from "./Toast";
import { Button, cx, input, label } from "./ui";

export type WalkingMeasure = "minutes" | "km" | "steps";

const WALKING_MEASURES: { id: WalkingMeasure; label: string }[] = [
  { id: "minutes", label: "Minutos" },
  { id: "km", label: "Km" },
  { id: "steps", label: "Pasos" },
];

function ActivityFormInner({
  today,
  bodyWeightKg,
  heightCm = null,
  defaultType = "other",
  defaultMeasure = "minutes",
  onSuccess,
}: {
  today: string;
  bodyWeightKg: number;
  heightCm?: number | null;
  defaultType?: string;
  defaultMeasure?: WalkingMeasure;
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState(logActivity, undefined);
  const [type, setType] = useState(defaultType);
  const [measure, setMeasure] = useState<WalkingMeasure>(defaultMeasure);
  const [minutes, setMinutes] = useState(45);
  const [distanceKm, setDistanceKm] = useState(5);
  const [steps, setSteps] = useState(8000);
  const [intensity, setIntensity] = useState<Intensity>("moderate");

  const isWalking = type === "walking";
  const activeMeasure: WalkingMeasure = isWalking ? measure : "minutes";

  const derivedKm = activeMeasure === "steps" ? stepsToKm(steps, heightCm) : distanceKm;
  const estMinutes = activeMeasure === "minutes" ? minutes : walkingDurationMin(derivedKm, intensity);
  const kcal =
    activeMeasure === "minutes"
      ? estimateKcal(metFor(type, intensity), bodyWeightKg, minutes)
      : estimateWalkingKcalFromKm(derivedKm, bodyWeightKg, intensity);

  useEffect(() => {
    if (state?.ok) {
      toast("Actividad registrada");
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="measure" value={activeMeasure} />
      <div>
        <label className={label} htmlFor="type">Actividad</label>
        <select id="type" name="type" className={input} value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="date">Fecha</label>
        <input id="date" name="date" type="date" className={input} defaultValue={today} />
      </div>
      {isWalking && (
        <div className="sm:col-span-2">
          <span className={label}>Medir por</span>
          <div className="grid grid-cols-3 gap-2">
            {WALKING_MEASURES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMeasure(m.id)}
                className={cx(
                  "h-9 cursor-pointer rounded-xl border text-xs font-medium transition-colors",
                  measure === m.id ? "border-accent bg-accent-soft font-semibold text-accent-ink" : "border-line",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {activeMeasure === "minutes" && (
        <div>
          <label className={label} htmlFor="durationMin">Duración (min)</label>
          <input id="durationMin" name="durationMin" type="number" min={1} className={input} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} />
        </div>
      )}
      {activeMeasure === "km" && (
        <div>
          <label className={label} htmlFor="distanceKm">Distancia (km)</label>
          <input id="distanceKm" name="distanceKm" type="number" step="0.1" min={0.1} className={input} value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value) || 0)} />
        </div>
      )}
      {activeMeasure === "steps" && (
        <div>
          <label className={label} htmlFor="steps">Pasos</label>
          <input id="steps" name="steps" type="number" step={100} min={1} className={input} value={steps} onChange={(e) => setSteps(Number(e.target.value) || 0)} />
        </div>
      )}
      <div>
        <label className={label} htmlFor="intensity">Intensidad</label>
        <select id="intensity" name="intensity" className={input} value={intensity} onChange={(e) => setIntensity(e.target.value as Intensity)}>
          {Object.entries(INTENSITIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="notes">Notas</label>
        <input id="notes" name="notes" className={input} placeholder="Ej.: partido 2 sets" />
      </div>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <p className="text-sm text-muted">
          ≈ <strong className="text-fg">{kcal} kcal</strong>
          {activeMeasure === "km" && estMinutes > 0 && <span> ({estMinutes} min est.)</span>}
          {activeMeasure === "steps" && derivedKm > 0 && <span> ({derivedKm.toFixed(1)} km · {estMinutes} min est.)</span>}
        </p>
        <Button disabled={pending}>Registrar</Button>
      </div>
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
    </form>
  );
}

export function ActivityForm({
  today,
  bodyWeightKg,
  heightCm = null,
  defaultType = "other",
  defaultMeasure = "minutes",
}: {
  today: string;
  bodyWeightKg: number;
  heightCm?: number | null;
  defaultType?: string;
  defaultMeasure?: WalkingMeasure;
}) {
  const [key, setKey] = useState(0);
  const close = useContext(CloseAddActivityContext);
  return (
    <ActivityFormInner
      key={`${defaultType}-${defaultMeasure}-${key}`}
      today={today}
      bodyWeightKg={bodyWeightKg}
      heightCm={heightCm}
      defaultType={defaultType}
      defaultMeasure={defaultMeasure}
      onSuccess={() => {
        setKey((k) => k + 1);
        close?.();
      }}
    />
  );
}
