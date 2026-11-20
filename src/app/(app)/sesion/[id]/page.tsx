import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { SessionRunner } from "@/components/SessionRunner";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSessionDetail, lastSetsByExercise, listExercisesLite, listRoutineExerciseIds } from "@/lib/data";
import { safeBackHref, safeBackLabel } from "@/lib/navigation";

export const metadata: Metadata = { title: "Entrenamiento" };

export default async function SessionPage({ params, searchParams }: PageProps<"/sesion/[id]">) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();
  const session = await getSessionDetail(user.id, sessionId);
  if (!session) notFound();
  const [exercises, last, routineExerciseIds] = await Promise.all([
    listExercisesLite(user.id),
    lastSetsByExercise(user.id, session.exercises.map((e) => e.exerciseId), session.id),
    session.routineId ? listRoutineExerciseIds(user.id, session.routineId) : Promise.resolve(null),
  ]);
  const previous = Object.fromEntries(last);
  const [y, m, d] = session.date.split("-");
  const exParam = typeof sp.ex === "string" ? Number(sp.ex) : NaN;
  const initialExerciseId = Number.isInteger(exParam) ? exParam : null;
  const backHref = safeBackHref(sp.from, `/calendario?d=${session.date}`);
  const backLabel = safeBackLabel(sp.label, "Calendario");

  return (
    <div>
      {session.endedAt && (
        <>
          <BackLink href={backHref} label={backLabel} className="mb-3" />
          <PageHeader title={session.name} subtitle={`${d}/${m}/${y} · terminado`} />
        </>
      )}
      <SessionRunner
        key={`${session.id}-${session.endedAt ? 1 : 0}`}
        session={session}
        exercises={exercises}
        previous={previous}
        bodyWeightKg={user.bodyWeightKg}
        routineExerciseIds={routineExerciseIds}
        initialExerciseId={initialExerciseId}
      />
    </div>
  );
}
