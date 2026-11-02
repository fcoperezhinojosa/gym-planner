"use client";

import { useState, useTransition } from "react";
import { setOverride } from "@/app/actions";
import type { DaySlot } from "@/lib/schedule";
import { SlotEditor, type RoutineOption } from "./SlotEditor";
import { Button } from "./ui";

/** Cambiar lo que toca solo un día concreto (excepción del calendario). */
export function DayOverride({ date, current, isOverride, routines }: { date: string; current: DaySlot; isOverride: boolean; routines: RoutineOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (!open)
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Cambiar solo este día
      </Button>
    );
  return (
    <div className="mt-2 w-full">
      <SlotEditor
        initial={current}
        routines={routines}
        pending={pending}
        onCancel={() => setOpen(false)}
        onReset={isOverride ? () => start(async () => { await setOverride(date, null); setOpen(false); }) : undefined}
        resetLabel="Volver al plan"
        onSave={(slot) =>
          start(async () => {
            await setOverride(date, slot);
            setOpen(false);
          })
        }
      />
    </div>
  );
}
