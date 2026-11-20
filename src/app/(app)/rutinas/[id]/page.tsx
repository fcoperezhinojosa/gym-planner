import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { RoutineEditor } from "@/components/RoutineEditor";
import { requireUser } from "@/lib/auth";
import { getRoutine, listExercisesLite } from "@/lib/data";

export const metadata: Metadata = { title: "Rutina" };

export default async function RoutinePage({ params }: PageProps<"/rutinas/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const routineId = Number(id);
  if (!Number.isInteger(routineId)) notFound();
  const [routine, exercises] = await Promise.all([getRoutine(user.id, routineId), listExercisesLite(user.id)]);
  if (!routine) notFound();
  return (
    <div>
      <BackLink href="/rutinas" label="Rutinas" className="mb-3" />
      <RoutineEditor key={routine.id} routine={routine} exercises={exercises} />
    </div>
  );
}
