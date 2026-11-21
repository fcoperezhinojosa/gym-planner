"use client";

import { useState } from "react";
import { SessionLoader, type LoaderVariant } from "@/components/SessionLoader";
import { Card } from "@/components/ui";

const OPTIONS: { id: LoaderVariant; title: string; note: string }[] = [
  { id: "curl", title: "A · Curl alterno", note: "Persona haciendo curl de bíceps con mancuernas, brazo a brazo." },
  { id: "flex", title: "B · Doble bíceps", note: "Pose de culturista con bíceps que se hinchan y anillo de progreso." },
  { id: "press", title: "C · Press con discos", note: "Se cargan los discos en la barra y la sube por encima de la cabeza." },
];

export function LoaderPreview() {
  const [full, setFull] = useState<LoaderVariant | null>(null);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <Card key={o.id} className="flex flex-col overflow-hidden">
            <SessionLoader variant={o.id} fullscreen={false} />
            <div className="mt-auto border-t border-line p-4">
              <h2 className="font-semibold">{o.title}</h2>
              <p className="mt-1 text-sm text-muted">{o.note}</p>
              <button onClick={() => setFull(o.id)} className="mt-3 cursor-pointer text-sm font-semibold text-accent-text">
                Ver a pantalla completa →
              </button>
            </div>
          </Card>
        ))}
      </div>
      {full && (
        <>
          <SessionLoader variant={full} />
          <button
            onClick={() => setFull(null)}
            className="fixed right-4 top-4 z-[101] cursor-pointer rounded-lg bg-card-2 px-3 py-1.5 text-sm font-semibold"
          >
            Cerrar
          </button>
        </>
      )}
    </>
  );
}
