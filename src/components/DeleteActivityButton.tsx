"use client";

import { useState, useTransition } from "react";
import { deleteActivity } from "@/app/actions";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "./Toast";

export function DeleteActivityButton({ id, label }: { id: number; label?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(true)}
        className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        aria-label={label ? `Borrar ${label}` : "Borrar actividad"}
        title="Eliminar"
      >
        {pending ? "…" : "✕"}
      </button>
      <ConfirmDialog
        open={confirming}
        title={label ? `¿Borrar ${label}?` : "¿Borrar actividad?"}
        description="Esta actividad se eliminará de tu historial y de las kcal del día."
        confirmLabel="Borrar"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          start(async () => {
            try {
              await deleteActivity(id);
              setConfirming(false);
              toast("Actividad eliminada");
            } catch {
              toast("No se pudo borrar la actividad", "danger");
            }
          })
        }
      />
    </>
  );
}
