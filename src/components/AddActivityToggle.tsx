"use client";

import { useState, type ReactNode } from "react";
import { ActionPanel } from "./ActionPanel";
import { CloseAddActivityContext } from "./AddActivityContext";
import { cx } from "./ui";

/** Botón "Registrar actividad" (lo ya hecho) que despliega el formulario a todo el ancho de la fila donde se coloque. */
export function AddActivityToggle({ children, label = "Registrar actividad", className }: { children: ReactNode; label?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx("inline-flex h-11 cursor-pointer items-center gap-1 text-sm font-semibold transition hover:opacity-80", className)}
      >
        {label}
      </button>
      {open && (
        <ActionPanel hoy title="Registrar actividad" hint="Anota algo que ya has hecho para sumar sus kcal a hoy.">
          <CloseAddActivityContext.Provider value={() => setOpen(false)}>{children}</CloseAddActivityContext.Provider>
        </ActionPanel>
      )}
    </>
  );
}
