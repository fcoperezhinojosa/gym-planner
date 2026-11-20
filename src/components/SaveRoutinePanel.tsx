"use client";

import { useState, useTransition } from "react";
import { createRoutineFromSession, updateRoutineFromSession } from "@/app/actions";
import { toast } from "./Toast";
import { Button, Card, input } from "./ui";

export function SaveRoutinePanel({ sessionId, routineName, hasChanges }: { sessionId: number; routineName: string; hasChanges: boolean }) {
  const [mode, setMode] = useState<"idle" | "new">("idle");
  const [newName, setNewName] = useState(`${routineName} v2`);
  const [done, setDone] = useState<"updated" | "created" | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <Card className="p-4 text-sm text-good">
        {done === "updated" ? `Rutina "${routineName}" actualizada ✓` : `Nueva rutina "${newName}" creada ✓`}
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-medium">
        {hasChanges ? "Los ejercicios han cambiado respecto a la rutina" : "Guardar en la rutina"}
      </p>
      {mode === "idle" ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 text-sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await updateRoutineFromSession(sessionId);
                  setDone("updated");
                  toast(`Rutina "${routineName}" actualizada`);
                } catch {
                  toast("No se pudo actualizar la rutina", "danger");
                }
              })
            }
          >
            Actualizar &ldquo;{routineName}&rdquo;
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 text-sm"
            disabled={pending}
            onClick={() => setMode("new")}
          >
            Crear nueva rutina
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className={input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1 text-sm" onClick={() => setMode("idle")}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1 text-sm"
              disabled={pending || !newName.trim()}
              onClick={() =>
                start(async () => {
                  try {
                    await createRoutineFromSession(sessionId, newName);
                    setDone("created");
                    toast(`Nueva rutina "${newName.trim()}" creada`);
                  } catch {
                    toast("No se pudo crear la rutina", "danger");
                  }
                })
              }
            >
              Guardar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
