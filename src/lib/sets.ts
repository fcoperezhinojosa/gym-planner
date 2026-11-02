export interface SetLike {
  reps: number;
  weightKg: number;
  completed?: boolean;
}

export type SetField = "reps" | "weightKg";

/**
 * Cambia el valor de una serie y lo propaga a las demás series del mismo
 * ejercicio que tenían el mismo valor anterior y que aún no están completadas.
 * Así 3×12 kg → 3×16 kg con un solo cambio, y una pirámide 12/14/16 no se rompe.
 */
export function propagate<T extends SetLike>(sets: T[], index: number, field: SetField, value: number): T[] {
  const old = sets[index]?.[field];
  if (old === undefined) return sets;
  return sets.map((s, i) => {
    if (i === index) return { ...s, [field]: value };
    if (s[field] === old && !s.completed) return { ...s, [field]: value };
    return s;
  });
}

/** Fuerza el valor en todas las series no completadas. */
export function applyToAll<T extends SetLike>(sets: T[], field: SetField, value: number): T[] {
  return sets.map((s) => (s.completed ? s : { ...s, [field]: value }));
}

/** Nueva serie copiando la última (o valores por defecto). */
export function nextSet<T extends SetLike>(sets: T[], fallback: SetLike = { reps: 10, weightKg: 0 }): SetLike {
  const last = sets[sets.length - 1] ?? fallback;
  return { reps: last.reps, weightKg: last.weightKg, completed: false };
}
