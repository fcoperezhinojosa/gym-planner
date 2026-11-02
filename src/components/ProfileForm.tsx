"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions";
import { Button, input, label } from "./ui";

export function ProfileForm({ name, weight }: { name: string; weight: number }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="name">Nombre</label>
        <input id="name" name="name" defaultValue={name} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="weight">Peso corporal (kg)</label>
        <input id="weight" name="weight" type="number" step="0.1" defaultValue={weight} className={input} />
        <p className="mt-1 text-xs text-muted">Se usa para estimar las kcal (MET × peso × horas). Solo afecta a los entrenos nuevos.</p>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good">Guardado ✓</p>}
      <Button disabled={pending}>Guardar</Button>
    </form>
  );
}
