"use client";

import { useTransition } from "react";
import { deleteWorkout } from "@/app/actions";

export function DeleteWorkoutButton({ id, label }: { id: number; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(label ? `¿Borrar "${label}"?` : "¿Borrar esta sesión?") && start(() => deleteWorkout(id, { redirectToHome: false }))}
      className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
      aria-label={label ? `Borrar ${label}` : "Borrar sesión"}
      title="Eliminar"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
