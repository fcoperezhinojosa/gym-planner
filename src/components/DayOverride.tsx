"use client";

import { useState, useTransition } from "react";
import { setOverride } from "@/app/actions";
import { MAX_EXTRA_ACTIVITIES, type DaySlot } from "@/lib/schedule";
import { ActionPanel } from "./ActionPanel";
import { SlotEditor, type RoutineOption } from "./SlotEditor";
import { toast } from "./Toast";
import { Button } from "./ui";

/** Abre el editor con una actividad más ya añadida (en descanso, pasa a ser la principal). */
function withExtraActivity(slot: DaySlot): DaySlot {
  if (slot.kind === "rest") return { ...slot, kind: "activity", activityType: "walking", extraActivities: [] };
  const used = new Set([...slot.extraActivities, slot.activityType]);
  const next = ["walking", "elliptical", "padel", "running", "cycling"].find((a) => !used.has(a)) ?? "other";
  return { ...slot, extraActivities: [...slot.extraActivities, next] };
}

/** Cambiar lo que toca solo un día concreto (excepción del calendario). */
export function DayOverride({
  date,
  current,
  isOverride,
  routines,
  showAddActivity = false,
  dayLabel = "este día",
  hoy = false,
}: {
  date: string;
  current: DaySlot;
  isOverride: boolean;
  routines: RoutineOption[];
  /** Muestra también "+ Añadir actividad" para planificar otra actividad ese día. */
  showAddActivity?: boolean;
  /** Cómo se nombra el día en los textos: "hoy", "este día"… */
  dayLabel?: string;
  /** Usa la paleta cobalto de la pestaña Hoy en el formulario. */
  hoy?: boolean;
}) {
  const [mode, setMode] = useState<"closed" | "edit" | "add">("closed");
  const [pending, start] = useTransition();
  const canAdd = showAddActivity && (current.extraActivities?.length ?? 0) < MAX_EXTRA_ACTIVITIES;
  if (mode === "closed")
    return (
      <>
        {canAdd && (
          <Button variant="secondary" size="sm" onClick={() => setMode("add")}>
            + {current.kind === "rest" ? "Planificar actividad" : "Añadir otra actividad"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setMode("edit")}>
          Cambiar plan de {dayLabel}
        </Button>
      </>
    );
  return (
    <ActionPanel
      hoy={hoy}
      title={mode === "add" ? "Planificar otra actividad" : `Cambiar el plan de ${dayLabel}`}
      hint={`Solo afecta a ${dayLabel}; el resto de la semana no cambia.`}
    >
      <SlotEditor
        initial={mode === "add" ? withExtraActivity(current) : current}
        routines={routines}
        pending={pending}
        onCancel={() => setMode("closed")}
        onReset={
          isOverride
            ? () =>
                start(async () => {
                  await setOverride(date, null);
                  setMode("closed");
                  toast("Vuelto al plan original");
                })
            : undefined
        }
        resetLabel="Volver al plan"
        onSave={(slot) =>
          start(async () => {
            await setOverride(date, slot);
            setMode("closed");
            toast("Cambios del día guardados");
          })
        }
      />
    </ActionPanel>
  );
}
