"use client";

import { useActionState, useEffect, useState } from "react";
import { logIntake } from "@/app/actions";
import { ActivityForm, type WalkingMeasure } from "./ActivityForm";
import { toast } from "./Toast";
import { Button, Card, cx, input, label } from "./ui";

const PRESETS: { id: string; label: string; type: string; measure?: WalkingMeasure }[] = [
  { id: "steps", label: "🚶 Pasos", type: "walking", measure: "steps" },
  { id: "walk-km", label: "🚶 Caminar (km)", type: "walking", measure: "km" },
  { id: "running", label: "🏃 Correr", type: "running" },
  { id: "padel", label: "🎾 Pádel", type: "padel" },
  { id: "cycling", label: "🚴 Bici", type: "cycling" },
  { id: "other", label: "✨ Otra", type: "other" },
];

function QuickIntakeCardInner({
  today,
  currentKcal,
  defaultIntake,
}: {
  today: string;
  currentKcal: number | null;
  defaultIntake: number | null;
}) {
  const [state, action, pending] = useActionState(logIntake, undefined);
  const [value, setValue] = useState(currentKcal !== null ? String(currentKcal) : "");

  useEffect(() => {
    if (state?.ok) toast("Kcal de hoy guardadas");
  }, [state]);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Kcal comidas hoy</h2>
          <p className="text-xs text-muted">Registra lo que has comido para calcular tu balance diario.</p>
        </div>
        {currentKcal !== null && (
          <span className="shrink-0 rounded-full bg-good/15 px-2.5 py-1 text-xs font-semibold text-good tabular">
            {currentKcal.toLocaleString("es-ES")} kcal
          </span>
        )}
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="date" value={today} />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className={label} htmlFor="quick-intake-kcal">
              Total de hoy (kcal)
            </label>
            <input
              id="quick-intake-kcal"
              name="kcal"
              type="number"
              inputMode="numeric"
              min={0}
              max={15000}
              placeholder={defaultIntake ? String(defaultIntake) : "2200"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={input}
            />
          </div>
          <Button disabled={pending}>Guardar</Button>
        </div>

        {defaultIntake && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setValue(String(defaultIntake))}
              className="cursor-pointer rounded-full border border-line bg-card-2 px-3 py-1 text-xs font-medium text-muted hover:border-accent hover:text-fg"
            >
              Usar habitual ({defaultIntake.toLocaleString("es-ES")} kcal)
            </button>
          </div>
        )}

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="text-sm text-good">Guardado ✓</p>}
      </form>
    </Card>
  );
}

export function QuickIntakeCard(props: {
  today: string;
  currentKcal: number | null;
  defaultIntake: number | null;
}) {
  return <QuickIntakeCardInner key={`${props.today}|${props.currentKcal ?? ""}`} {...props} />;
}

export function QuickActivityCard({
  today,
  bodyWeightKg,
  heightCm,
}: {
  today: string;
  bodyWeightKg: number;
  heightCm: number | null;
}) {
  const [preset, setPreset] = useState(PRESETS[0]);

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">Añadir actividad de hoy</h2>
        <p className="text-xs text-muted">Caminar (pasos o km), correr, pádel, bici… elige un atajo o ajusta los datos.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p)}
            className={cx(
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              preset.id === p.id
                ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                : "border-line bg-card text-muted hover:text-fg",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ActivityForm
        today={today}
        bodyWeightKg={bodyWeightKg}
        heightCm={heightCm}
        defaultType={preset.type}
        defaultMeasure={preset.measure ?? "minutes"}
      />
    </Card>
  );
}
