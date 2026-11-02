"use client";

import { useActionState } from "react";
import { createCustomExercise } from "@/app/actions";
import { EQUIPMENT, MUSCLES } from "@/lib/labels";
import { Button, input, label } from "./ui";

export function CustomExerciseForm() {
  const [state, action, pending] = useActionState(createCustomExercise, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="name">Nombre</label>
        <input id="name" name="name" className={input} required placeholder="Ej.: Press inclinado en máquina Hammer" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label} htmlFor="muscle">Músculo principal</label>
          <select id="muscle" name="muscle" className={input} required defaultValue="chest">
            {Object.entries(MUSCLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="equipment">Material</label>
          <select id="equipment" name="equipment" className={input} defaultValue="machine">
            {Object.entries(EQUIPMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor="image">URL de imagen (opcional)</label>
        <input id="image" name="image" className={input} placeholder="https://…" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button disabled={pending}>Crear ejercicio</Button>
    </form>
  );
}
