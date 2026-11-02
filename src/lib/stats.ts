/** 1RM estimado (Epley). Con 1 repetición devuelve el propio peso. */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function volume(sets: { reps: number; weightKg: number }[]): number {
  return sets.reduce((acc, s) => acc + s.reps * s.weightKg, 0);
}

/**
 * Sugerencia de sobrecarga progresiva: si en la última sesión se completaron
 * todas las series con las reps objetivo, sube un escalón de peso.
 */
export function suggestWeight(last: { reps: number; weightKg: number; completed: boolean }[], targetReps: number, step = 2.5) {
  if (last.length === 0) return null;
  const allDone = last.every((s) => s.completed && s.reps >= targetReps);
  const top = Math.max(...last.map((s) => s.weightKg));
  return allDone && top > 0 ? top + step : null;
}

/** Semanas consecutivas (hasta la actual o la anterior) que cumplen el objetivo. */
export function weekStreak(weeks: { done: number; planned: number }[]): number {
  // weeks ordenadas de más antigua a más reciente; la última es la semana en curso
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i];
    const ok = w.planned > 0 ? w.done >= w.planned : w.done > 0;
    if (ok) streak++;
    else if (i === weeks.length - 1) continue; // la semana en curso aún puede completarse
    else break;
  }
  return streak;
}
