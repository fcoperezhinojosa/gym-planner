"use client";

import { applyToAll, nextSet, propagate, type SetField } from "@/lib/sets";
import { cx } from "./ui";

export type EditableSet = { reps: number; weightKg: number; type?: string; completed?: boolean };

/**
 * Tabla de series. Cambiar el peso o las reps de una serie lo propaga a las
 * que tenían el mismo valor y no están completadas (ver lib/sets.ts).
 */
export function SetsEditor({
  sets,
  onChange,
  trackCompletion,
  onComplete,
  previous,
}: {
  sets: EditableSet[];
  onChange: (sets: EditableSet[]) => void;
  trackCompletion?: boolean;
  onComplete?: (index: number) => void;
  previous?: { reps: number; weightKg: number }[];
}) {
  const update = (i: number, field: SetField, raw: string) => {
    const v = Number(raw.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) return;
    onChange(propagate(sets, i, field, field === "reps" ? Math.round(v) : v));
  };

  return (
    <div>
      <div className={cx("grid items-center gap-2 px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted", trackCompletion ? "grid-cols-[2rem_1fr_1fr_1fr_2.5rem]" : "grid-cols-[2rem_1fr_1fr_1fr_2rem]")}>
        <span>Serie</span>
        <span>Anterior</span>
        <span className="text-center">Kg</span>
        <span className="text-center">Reps</span>
        <span />
      </div>
      <ul className="space-y-1.5">
        {sets.map((s, i) => {
          const prev = previous?.[i];
          return (
            <li
              key={i}
              className={cx(
                "grid items-center gap-2 rounded-xl px-1 py-1",
                trackCompletion ? "grid-cols-[2rem_1fr_1fr_1fr_2.5rem]" : "grid-cols-[2rem_1fr_1fr_1fr_2rem]",
                s.completed && "bg-good/10",
              )}
            >
              <span className="text-center text-sm font-semibold text-muted">{i + 1}</span>
              <span className="truncate text-xs text-muted tabular">{prev ? `${prev.weightKg} × ${prev.reps}` : "—"}</span>
              <input
                aria-label={`Peso serie ${i + 1}`}
                inputMode="decimal"
                type="number"
                step="0.5"
                min={0}
                value={s.weightKg}
                onChange={(e) => update(i, "weightKg", e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-10 w-full rounded-lg border border-line bg-card-2 text-center text-sm font-semibold tabular outline-none focus:border-accent"
              />
              <input
                aria-label={`Repeticiones serie ${i + 1}`}
                inputMode="numeric"
                type="number"
                min={0}
                value={s.reps}
                onChange={(e) => update(i, "reps", e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-10 w-full rounded-lg border border-line bg-card-2 text-center text-sm font-semibold tabular outline-none focus:border-accent"
              />
              {trackCompletion ? (
                <button
                  aria-label={s.completed ? `Desmarcar serie ${i + 1}` : `Completar serie ${i + 1}`}
                  onClick={() => {
                    onChange(sets.map((x, k) => (k === i ? { ...x, completed: !x.completed } : x)));
                    if (!s.completed) onComplete?.(i);
                  }}
                  className={cx(
                    "flex h-10 w-10 items-center justify-center rounded-lg border text-lg",
                    s.completed ? "border-good bg-good text-white" : "border-line text-muted hover:border-good",
                  )}
                >
                  ✓
                </button>
              ) : (
                <button
                  aria-label={`Quitar serie ${i + 1}`}
                  onClick={() => onChange(sets.filter((_, k) => k !== i))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => onChange([...sets, nextSet(sets)])} className="rounded-lg bg-card-2 px-3 py-1.5 text-xs font-semibold hover:bg-line">
          + Serie
        </button>
        {trackCompletion && sets.length > 1 && (
          <button onClick={() => onChange(sets.slice(0, -1))} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-card-2">
            − Quitar última
          </button>
        )}
        {sets.length > 1 && (
          <button
            onClick={() => {
              const first = sets.find((x) => !x.completed) ?? sets[0];
              onChange(applyToAll(applyToAll(sets, "weightKg", first.weightKg), "reps", first.reps));
            }}
            className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-card-2"
            title="Copia peso y reps de la primera serie pendiente al resto"
          >
            Igualar series
          </button>
        )}
      </div>
    </div>
  );
}
