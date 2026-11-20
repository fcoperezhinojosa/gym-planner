"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { cx } from "./ui";

/** Botón submit que se deshabilita al instante para evitar crear sesiones duplicadas por doble pulsación. */
export function StartWorkoutButton({
  className,
  pendingLabel = "Abriendo…",
  children,
}: {
  className?: string;
  pendingLabel?: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cx("disabled:pointer-events-none disabled:opacity-70", className)}>
      {pending ? <span className="mx-auto">{pendingLabel}</span> : children}
    </button>
  );
}
