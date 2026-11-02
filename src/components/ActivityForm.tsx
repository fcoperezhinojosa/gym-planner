"use client";

import { useActionState, useState } from "react";
import { logActivity } from "@/app/actions";
import { ACTIVITY_TYPES, INTENSITIES, estimateKcal, metFor, type Intensity } from "@/lib/kcal";
import { Button, input, label } from "./ui";

export function ActivityForm({ today, bodyWeightKg, defaultType = "padel" }: { today: string; bodyWeightKg: number; defaultType?: string }) {
  const [state, action, pending] = useActionState(logActivity, undefined);
  const [type, setType] = useState(defaultType);
  const [minutes, setMinutes] = useState(90);
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const kcal = estimateKcal(metFor(type, intensity), bodyWeightKg, minutes);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={label} htmlFor="type">Actividad</label>
        <select id="type" name="type" className={input} value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(ACTIVITY_TYPES)
            .filter(([k]) => k !== "gym")
            .map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="date">Fecha</label>
        <input id="date" name="date" type="date" className={input} defaultValue={today} />
      </div>
      <div>
        <label className={label} htmlFor="durationMin">Duración (min)</label>
        <input id="durationMin" name="durationMin" type="number" min={1} className={input} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} />
      </div>
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
        <p className="text-sm text-muted">≈ <strong className="text-fg">{kcal} kcal</strong></p>
        <Button disabled={pending}>Registrar</Button>
      </div>
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good sm:col-span-2">Guardado ✓</p>}
    </form>
  );
}
