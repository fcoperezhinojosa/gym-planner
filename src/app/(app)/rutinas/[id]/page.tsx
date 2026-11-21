import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { RoutineEditor } from "@/components/RoutineEditor";
import { requireUser } from "@/lib/auth";
import { getRoutine } from "@/lib/data";
import RoutineLoading from "./loading";

export const metadata: Metadata = { title: "Rutina" };

export default function RoutinePage({ params }: PageProps<"/rutinas/[id]">) {
  return (
    <div>
      <BackLink href="/rutinas" label="Rutinas" className="mb-3" />
      <Suspense fallback={<RoutineLoading />}>
        <RoutineContent params={params} />
      </Suspense>
    </div>
  );
}

async function RoutineContent({ params }: Pick<PageProps<"/rutinas/[id]">, "params">) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const routineId = Number(id);
  if (!Number.isInteger(routineId)) notFound();
  const routine = await getRoutine(user.id, routineId);
  if (!routine) notFound();
  return <RoutineEditor key={routine.id} routine={routine} />;
}
