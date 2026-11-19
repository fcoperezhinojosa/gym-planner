"use client";

import { useTransition } from "react";
import { deleteActivity } from "@/app/actions";

export function DeleteActivityButton({ id, label }: { id: number; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(label ? `¿Borrar ${label}?` : "¿Borrar actividad?") && start(() => deleteActivity(id))}
      className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
      aria-label={label ? `Borrar ${label}` : "Borrar actividad"}
      title="Eliminar"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
