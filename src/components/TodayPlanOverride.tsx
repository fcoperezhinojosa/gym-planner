"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { DaySlot } from "@/lib/schedule";
import { DayOverridePanel } from "./DayOverride";
import type { RoutineOption } from "./SlotEditor";
import { cx } from "./ui";

type TodayPlanContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  date: string;
  current: DaySlot;
  isOverride: boolean;
  routines: RoutineOption[];
  hasRoutine: boolean;
};

const TodayPlanContext = createContext<TodayPlanContextValue | null>(null);

function useTodayPlan() {
  const ctx = useContext(TodayPlanContext);
  if (!ctx) throw new Error("TodayPlanTrigger/TodayPlanPanel debe usarse dentro de TodayPlanProvider");
  return ctx;
}

/** Coordina el botón dentro del anillo de Hoy con el panel desplegable fuera del anillo. */
export function TodayPlanProvider({
  date,
  current,
  isOverride,
  routines,
  children,
}: {
  date: string;
  current: DaySlot;
  isOverride: boolean;
  routines: RoutineOption[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasRoutine = current.kind === "workout";
  return (
    <TodayPlanContext.Provider value={{ open, setOpen, date, current, isOverride, routines, hasRoutine }}>
      {children}
    </TodayPlanContext.Provider>
  );
}

/** Pill dentro del anillo oscuro para añadir o cambiar la rutina de hoy. */
export function TodayPlanTrigger() {
  const { open, setOpen, hasRoutine } = useTodayPlan();
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cx(
        "mt-1 inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-3.5 text-xs font-semibold text-[#e4e9ff] transition active:scale-[.98]",
        open ? "bg-white/25 ring-1 ring-white/40" : "bg-white/15 hover:bg-white/25",
      )}
    >
      {hasRoutine ? "Cambiar rutina" : "+ Añadir rutina"}
    </button>
  );
}

/** Panel desplegable a ancho completo debajo del anillo. */
export function TodayPlanPanel() {
  const { open, setOpen, date, current, isOverride, routines, hasRoutine } = useTodayPlan();
  if (!open) return null;
  const initial: DaySlot =
    !hasRoutine && routines.length > 0
      ? { ...current, kind: "workout", routineId: current.routineId ?? routines[0].id }
      : current;
  return (
    <DayOverridePanel
      date={date}
      initial={initial}
      isOverride={isOverride}
      routines={routines}
      title={hasRoutine ? "Cambiar la rutina de hoy" : "Añadir rutina para hoy"}
      hint="Solo afecta a hoy; el resto de la semana no cambia."
      onClose={() => setOpen(false)}
    />
  );
}
