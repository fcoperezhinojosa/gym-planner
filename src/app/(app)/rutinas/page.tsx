import type { Metadata } from "next";
import Link from "next/link";
import { createRoutine } from "@/app/actions";
import { Button, Card, Empty, PageHeader, Pill, input } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listRoutines } from "@/lib/data";
import { MUSCLE_GROUPS, muscleGroup } from "@/lib/labels";

export const metadata: Metadata = { title: "Rutinas" };

export default async function RoutinesPage() {
  const user = await requireUser();
  const routines = await listRoutines(user.id);
  return (
    <div className="space-y-4">
      <PageHeader title="Rutinas" subtitle="Plantillas de cada día de entreno. Sin límite de ejercicios." />
      <form action={createRoutine} className="flex gap-2">
        <input name="name" className={input} placeholder="Ej.: Pecho bajo + tríceps" aria-label="Nombre de la nueva rutina" />
        <Button className="shrink-0">Crear</Button>
      </form>
      {routines.length === 0 ? (
        <Empty title="Todavía no tienes rutinas">Crea una por cada tipo de día: pecho, espalda, pierna, core…</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {routines.map((r) => {
            const groups = [...new Set(r.muscles.map(muscleGroup))];
            return (
              <li key={r.id}>
                <Link href={`/rutinas/${r.id}`}>
                  <Card className="h-full p-4 transition hover:border-accent">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                      <h2 className="font-semibold">{r.name}</h2>
                    </div>
                    <p className="text-sm text-muted">{r.exerciseCount} ejercicios · {r.setCount} series</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {groups.map((g) => <Pill key={g}>{MUSCLE_GROUPS[g].label}</Pill>)}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
