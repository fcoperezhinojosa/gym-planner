"use client";

import { useState, useTransition } from "react";
import { deleteWorkout } from "@/app/actions";
import { clearFinish } from "@/lib/offline-queue";
import { clearPauseState } from "@/lib/session-timer";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "./Toast";
import { cx } from "./ui";

export function DeleteWorkoutButton({
  id,
  label,
  tone = "default",
}: {
  id: number;
  label?: string;
  tone?: "default" | "onDark";
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirming(true);
        }}
        className={cx(
          "shrink-0 cursor-pointer rounded-lg px-2 py-1 transition-colors disabled:opacity-50",
          tone === "onDark"
            ? "text-white/80 hover:bg-white/15 hover:text-white"
            : "text-muted hover:bg-danger/10 hover:text-danger",
        )}
        aria-label={label ? `Borrar ${label}` : "Borrar sesión"}
        title="Eliminar"
      >
        {pending ? "…" : "✕"}
      </button>
      <ConfirmDialog
        open={confirming}
        title={label ? `¿Borrar "${label}"?` : "¿Borrar esta sesión?"}
        description="Se eliminarán las series registradas de este entrenamiento."
        confirmLabel="Borrar"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          start(async () => {
            try {
              clearFinish(id);
              clearPauseState(id);
              await deleteWorkout(id, { redirectToHome: false });
              setConfirming(false);
              toast("Sesión eliminada");
            } catch {
              toast("No se pudo borrar la sesión", "danger");
            }
          })
        }
      />
    </>
  );
}
