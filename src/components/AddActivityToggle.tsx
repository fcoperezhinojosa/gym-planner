"use client";

import { useState, type ReactNode } from "react";
import { CloseAddActivityContext } from "./AddActivityContext";
import { cx } from "./ui";

/** Botón "Añadir actividad" que despliega el formulario a todo el ancho de la fila donde se coloque. */
export function AddActivityToggle({ children, label = "Añadir actividad", className }: { children: ReactNode; label?: ReactNode; className?: string }) {
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
        <div className="w-full basis-full rounded-2xl border border-hoy-line bg-card p-3 text-fg">
          <CloseAddActivityContext.Provider value={() => setOpen(false)}>{children}</CloseAddActivityContext.Provider>
        </div>
      )}
    </>
  );
}
