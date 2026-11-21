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

/** Panel compartido para editar o restablecer el plan de un día concreto. */
export function DayOverridePanel({
  date,
  initial,
  isOverride,
  routines,
  title,
  hint,
  onClose,
}: {
  date: string;
  initial: DaySlot;
  isOverride: boolean;
  routines: RoutineOption[];
  title: string;
  hint: string;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <ActionPanel title={title} hint={hint}>
      <SlotEditor
        initial={initial}
        routines={routines}
        pending={pending}
        onCancel={onClose}
        onReset={
          isOverride
            ? () =>
                start(async () => {
                  try {
                    await setOverride(date, null);
                    onClose();
                    toast("Vuelto al plan original");
                  } catch {
                    toast("No se pudo restablecer el plan", "danger");
                  }
                })
            : undefined
        }
        resetLabel="Volver al plan"
        onSave={(slot) =>
          start(async () => {
            try {
              await setOverride(date, slot);
              onClose();
              toast("Cambios del día guardados");
            } catch {
              toast("No se pudieron guardar los cambios", "danger");
            }
          })
        }
      />
    </ActionPanel>
  );
}

/** Cambiar lo que toca solo un día concreto (excepción del calendario). */
export function DayOverride({
  date,
  current,
  isOverride,
  routines,
  showAddActivity = false,
  dayLabel = "este día",
}: {
  date: string;
  current: DaySlot;
  isOverride: boolean;
  routines: RoutineOption[];
  /** Muestra también "+ Añadir actividad" para planificar otra actividad ese día. */
  showAddActivity?: boolean;
  /** Cómo se nombra el día en los textos: "hoy", "este día"… */
  dayLabel?: string;
}) {
  const [mode, setMode] = useState<"closed" | "edit" | "add">("closed");
  const canAdd = showAddActivity && (current.extraActivities?.length ?? 0) < MAX_EXTRA_ACTIVITIES;
  if (mode === "closed")
    return (
      <>
        {canAdd && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode("add")}>
            + {current.kind === "rest" ? "Planificar actividad" : "Añadir otra actividad"}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => setMode("edit")}>
          Cambiar plan de {dayLabel}
        </Button>
      </>
    );
  return (
    <DayOverridePanel
      date={date}
      initial={mode === "add" ? withExtraActivity(current) : current}
      isOverride={isOverride}
      routines={routines}
      title={mode === "add" ? "Planificar otra actividad" : `Cambiar el plan de ${dayLabel}`}
      hint={`Solo afecta a ${dayLabel}; el resto de la semana no cambia.`}
      onClose={() => setMode("closed")}
    />
  );
}
