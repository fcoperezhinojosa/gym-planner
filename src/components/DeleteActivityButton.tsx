"use client";

import { useTransition } from "react";
import { deleteActivity } from "@/app/actions";

export function DeleteActivityButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => confirm("¿Borrar actividad?") && start(() => deleteActivity(id))}
      className="rounded-lg px-2 py-1 text-muted hover:bg-danger/10 hover:text-danger"
      aria-label="Borrar actividad"
    >
      ✕
    </button>
  );
}
