"use client";

import { useState, useTransition } from "react";
import { savePlan, setPlanDay } from "@/app/actions";
import { WEEKDAYS } from "@/lib/labels";
import { weekLetter, type DaySlot } from "@/lib/schedule";
import { dayEmoji, dayTitle, slotColor } from "./DayBadge";
import { SlotEditor, type RoutineOption } from "./SlotEditor";
import { Button, Card, cx, input, label } from "./ui";

type Plan = {
  id: number;
  name: string;
  startDate: string;
  cycleWeeks: number;
  days: (DaySlot & { weekIndex: number; weekday: number })[];
} | null;

export function PlanEditor({ plan, routines, today, currentWeek }: { plan: Plan; routines: RoutineOption[]; today: string; currentWeek: number | null }) {
  const [editing, setEditing] = useState<{ w: number; d: number } | null>(null);
  const [pending, start] = useTransition();
  const [week, setWeek] = useState(currentWeek ?? 0);

  const settings = (
    <form action={(f) => start(() => savePlan(f))} className="grid gap-3 sm:grid-cols-[1fr_10rem_8rem_auto] sm:items-end">
      <div>
        <label className={label} htmlFor="pname">Nombre</label>
        <input id="pname" name="name" className={input} defaultValue={plan?.name ?? "Mi plan"} />
      </div>
      <div>
        <label className={label} htmlFor="start">Empieza (semana A)</label>
        <input id="start" name="startDate" type="date" className={input} defaultValue={plan?.startDate ?? today} />
      </div>
      <div>
        <label className={label} htmlFor="cycle">Semanas del ciclo</label>
        <select id="cycle" name="cycleWeeks" className={input} defaultValue={plan?.cycleWeeks ?? 2}>
          {[1, 2, 3, 4, 5, 6, 8].map((n) => (
            <option key={n} value={n}>{n === 1 ? "1 (igual siempre)" : `${n} (${Array.from({ length: n }, (_, i) => weekLetter(i)).join("/")})`}</option>
          ))}
        </select>
      </div>
      <Button disabled={pending}>{plan ? "Guardar" : "Crear plan"}</Button>
    </form>
  );

  if (!plan) return <Card className="p-4">{settings}</Card>;

  const w = Math.min(week, plan.cycleWeeks - 1);
  const slot = (d: number): DaySlot & { routineName?: string | null; routineColor?: string | null } => {
    const found = plan.days.find((x) => x.weekIndex === w && x.weekday === d);
    if (!found) return { kind: "rest", routineId: null, activityType: null, extraActivities: [], label: null };
    const r = routines.find((x) => x.id === found.routineId);
    return { ...found, routineName: r?.name ?? null, routineColor: r?.color ?? null };
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">{settings}</Card>

      {plan.cycleWeeks > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: plan.cycleWeeks }, (_, i) => (
            <button
              key={i}
              onClick={() => setWeek(i)}
              className={cx("h-10 shrink-0 rounded-xl border px-4 text-sm font-semibold", i === w ? "border-accent bg-accent-soft text-accent" : "border-line")}
            >
              Semana {weekLetter(i)} {i === currentWeek && <span className="ml-1 text-xs font-normal">(esta)</span>}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {WEEKDAYS.map((name, idx) => {
          const d = idx + 1;
          const s = slot(d);
          const open = editing?.w === w && editing.d === d;
          return (
            <li key={d}>
              <Card className="p-3">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setEditing(open ? null : { w, d })}>
                  <span className="w-20 shrink-0 text-sm font-semibold">{name}</span>
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: slotColor(s) }} />
                  <span className="text-lg">{dayEmoji(s)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{dayTitle(s)}</span>
                    {s.label && <span className="block truncate text-xs text-muted">{s.label}</span>}
                  </span>
                  <span className="text-xs text-muted">Editar</span>
                </button>
                {open && (
                  <div className="mt-3 border-t border-line pt-3">
                    <SlotEditor
                      initial={s}
                      routines={routines}
                      pending={pending}
                      onCancel={() => setEditing(null)}
                      onSave={(v) =>
                        start(async () => {
                          await setPlanDay(w, d, v);
                          setEditing(null);
                        })
                      }
                    />
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
