"use client";

import { useMemo, useState } from "react";
import type { ExerciseLite } from "@/lib/data";
import { EQUIPMENT, MUSCLES, equipmentLabel, muscleLabel } from "@/lib/labels";
import { normalize } from "@/lib/text";
import { ExerciseThumb } from "./ExerciseThumb";
import { Button, cx, input } from "./ui";

export function ExercisePicker({
  exercises,
  onConfirm,
  onClose,
  pending,
}: {
  exercises: ExerciseLite[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
  pending?: boolean;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const results = useMemo(() => {
    const nq = normalize(q);
    return exercises.filter(
      (e) =>
        (!muscle || e.primaryMuscle === muscle) &&
        (!equipment || e.equipment === equipment) &&
        (!nq || normalize(e.name).includes(nq)),
    );
  }, [exercises, q, muscle, equipment]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Añadir ejercicios"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-bg md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 border-b border-line p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Añadir ejercicios</h2>
            <button onClick={onClose} className="rounded-lg px-2 py-1 text-muted hover:bg-card-2" aria-label="Cerrar">✕</button>
          </div>
          <input autoFocus className={input} placeholder="Buscar (press, curl, squat…)" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className={input} value={muscle} onChange={(e) => setMuscle(e.target.value)} aria-label="Músculo">
              <option value="">Todos los músculos</option>
              {Object.entries(MUSCLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select className={input} value={equipment} onChange={(e) => setEquipment(e.target.value)} aria-label="Material">
              <option value="">Todo el material</option>
              {Object.entries(EQUIPMENT).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {results.slice(0, 80).map((e) => {
            const on = selected.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  onClick={() => toggle(e.id)}
                  className={cx("flex w-full items-center gap-3 rounded-xl p-2 text-left", on ? "bg-accent-soft" : "hover:bg-card-2")}
                >
                  <ExerciseThumb image={e.image} muscle={e.primaryMuscle} className="h-12 w-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.name}</span>
                    <span className="block text-xs text-muted">
                      {muscleLabel(e.primaryMuscle)} · {equipmentLabel(e.equipment)}
                    </span>
                  </span>
                  <span className={cx("flex h-6 w-6 items-center justify-center rounded-full border text-xs", on ? "border-accent bg-accent text-accent-fg" : "border-line")}>
                    {on ? selected.indexOf(e.id) + 1 : ""}
                  </span>
                </button>
              </li>
            );
          })}
          {results.length > 80 && <li className="p-3 text-center text-xs text-muted">{results.length - 80} más… afina la búsqueda</li>}
          {results.length === 0 && <li className="p-6 text-center text-sm text-muted">Sin resultados</li>}
        </ul>
        <div className="flex gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-[2]" disabled={!selected.length || pending} onClick={() => onConfirm(selected)}>
            Añadir {selected.length || ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
