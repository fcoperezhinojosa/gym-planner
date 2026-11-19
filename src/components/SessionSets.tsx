"use client";

import { applyToAll, nextSet, propagate, type SetField } from "@/lib/sets";
import type { EditableSet } from "./SetsEditor";
import { cx } from "./ui";

const COLS = "grid-cols-[2.5rem_1fr_4.25rem_4.25rem_2.75rem]";

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * Tabla de series del entreno en curso: la primera serie sin completar es la
 * "actual" (resaltada) y avisa si subes peso respecto a la última vez.
 */
export function SessionSets({
  sets,
  previous,
  onChange,
  onComplete,
}: {
  sets: EditableSet[];
  previous?: { reps: number; weightKg: number }[];
  onChange: (sets: EditableSet[]) => void;
  onComplete?: (index: number) => void;
}) {
  const current = sets.findIndex((s) => !s.completed);

  const update = (i: number, field: SetField, raw: string) => {
    const v = Number(raw.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) return;
    onChange(propagate(sets, i, field, field === "reps" ? Math.round(v) : v));
  };

  const inputCls =
    "h-11 w-full rounded-xl border-0 bg-hoy-track text-center font-display text-[17px] font-bold tabular text-hoy-ink outline-none focus:ring-2 focus:ring-hoy-blue";

  return (
    <div>
      <div className={cx("grid gap-2 px-1 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-hoy-muted", COLS)}>
        <span className="text-center">SERIE</span>
        <span>ANTERIOR</span>
        <span className="text-center">KG</span>
        <span className="text-center">REPS</span>
        <span />
      </div>
      <ul className="space-y-1.5">
        {sets.map((s, i) => {
          const prev = previous?.[i];
          const isCurrent = i === current;
          const gain = isCurrent && prev && s.weightKg > prev.weightKg ? s.weightKg - prev.weightKg : 0;
          return (
            <li
              key={i}
              className={cx(
                "rounded-2xl p-1",
                s.completed && "bg-hoy-tint",
                isCurrent && "shadow-[inset_0_0_0_1.5px_var(--hoy-blue)]",
              )}
            >
              <div className={cx("grid items-center gap-2", COLS)}>
                <span className={cx("text-center text-[15px] font-bold", isCurrent ? "text-hoy-blue" : s.completed ? "text-hoy-ink" : "text-hoy-muted")}>
                  {i + 1}
                </span>
                <span className="truncate text-[13px] text-hoy-muted tabular">{prev ? `${prev.weightKg} × ${prev.reps}` : "—"}</span>
                {s.completed ? (
                  <span className="flex h-11 items-center justify-center font-display text-[17px] font-bold tabular">{s.weightKg}</span>
                ) : (
                  <input
                    aria-label={`Peso serie ${i + 1}`}
                    inputMode="decimal"
                    type="number"
                    step="0.5"
                    min={0}
                    value={s.weightKg}
                    onChange={(e) => update(i, "weightKg", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className={inputCls}
                  />
                )}
                {s.completed ? (
                  <span className="flex h-11 items-center justify-center font-display text-[17px] font-bold tabular">{s.reps}</span>
                ) : (
                  <input
                    aria-label={`Repeticiones serie ${i + 1}`}
                    inputMode="numeric"
                    type="number"
                    min={0}
                    value={s.reps}
                    onChange={(e) => update(i, "reps", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className={inputCls}
                  />
                )}
                <button
                  type="button"
                  aria-label={s.completed ? `Desmarcar serie ${i + 1}` : isCurrent ? `Marcar serie ${i + 1} y empezar descanso` : `Completar serie ${i + 1}`}
                  onClick={() => {
                    onChange(sets.map((x, k) => (k === i ? { ...x, completed: !x.completed } : x)));
                    if (!s.completed) onComplete?.(i);
                  }}
                  className={cx(
                    "flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] transition active:scale-95",
                    s.completed
                      ? "border-hoy-blue bg-hoy-blue text-white"
                      : isCurrent
                        ? "border-hoy-blue bg-card text-hoy-blue"
                        : "border-hoy-line bg-card text-hoy-muted",
                  )}
                >
                  <CheckIcon />
                </button>
              </div>
              {gain > 0 && (
                <p className="flex items-center gap-1.5 pb-0.5 pl-10 pt-1 text-xs font-semibold text-hoy-mint-ink">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M6 11l6-6 6 6" />
                  </svg>
                  +{Number.isInteger(gain) ? gain : gain.toFixed(1)} kg sobre la última vez
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onChange([...sets, nextSet(sets)])}
        className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-hoy-line text-sm font-semibold text-hoy-blue transition hover:bg-hoy-surface"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Añadir serie
      </button>
      {sets.length > 1 && (
        <div className="mt-1 flex justify-center gap-4">
          <button type="button" onClick={() => onChange(sets.slice(0, -1))} className="h-11 text-xs font-semibold text-hoy-muted hover:text-hoy-ink">
            Quitar última
          </button>
          <button
            type="button"
            title="Copia peso y reps de la primera serie pendiente al resto"
            onClick={() => {
              const first = sets.find((x) => !x.completed) ?? sets[0];
              onChange(applyToAll(applyToAll(sets, "weightKg", first.weightKg), "reps", first.reps));
            }}
            className="h-11 text-xs font-semibold text-hoy-muted hover:text-hoy-ink"
          >
            Igualar series
          </button>
        </div>
      )}
    </div>
  );
}
