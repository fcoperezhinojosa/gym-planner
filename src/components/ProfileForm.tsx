"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions";
import { Button, input, label } from "./ui";

export function ProfileForm({
  name,
  weight,
  sex,
  birthYear,
  heightCm,
  dailyIntakeKcal,
}: {
  name: string;
  weight: number;
  sex: string | null;
  birthYear: number | null;
  heightCm: number | null;
  dailyIntakeKcal: number | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    // key: tras guardar, React resetea el form a los defaultValue; así se remonta con los valores nuevos.
    <form key={`${sex}|${birthYear}|${heightCm}|${dailyIntakeKcal}|${weight}`} action={action} className="space-y-3">
      <div>
        <label className={label} htmlFor="name">Nombre</label>
        <input id="name" name="name" defaultValue={name} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="weight">Peso corporal (kg)</label>
        <input id="weight" name="weight" type="number" step="0.1" defaultValue={weight} className={input} />
        <p className="mt-1 text-xs text-muted">Se usa para estimar las kcal (MET × peso × horas). Solo afecta a los entrenos nuevos.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label} htmlFor="sex">Sexo</label>
          <select id="sex" name="sex" defaultValue={sex ?? ""} className={input}>
            <option value="">—</option>
            <option value="male">Hombre</option>
            <option value="female">Mujer</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="birthYear">Año nac.</label>
          <input id="birthYear" name="birthYear" type="number" inputMode="numeric" placeholder="1990" defaultValue={birthYear ?? ""} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="heightCm">Altura (cm)</label>
          <input id="heightCm" name="heightCm" type="number" inputMode="numeric" placeholder="175" defaultValue={heightCm ?? ""} className={input} />
        </div>
      </div>
      <p className="-mt-1 text-xs text-muted">Para estimar tu metabolismo basal y el gasto diario total en Analítica.</p>
      <div>
        <label className={label} htmlFor="dailyIntakeKcal">Lo que comes habitualmente (kcal/día)</label>
        <input id="dailyIntakeKcal" name="dailyIntakeKcal" type="number" inputMode="numeric" placeholder="2200" defaultValue={dailyIntakeKcal ?? ""} className={input} />
        <p className="mt-1 text-xs text-muted">Opcional. Se usa los días que no registras lo que has comido.</p>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good">Guardado ✓</p>}
      <Button disabled={pending}>Guardar</Button>
    </form>
  );
}
