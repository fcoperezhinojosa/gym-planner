import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { SessionRunner } from "@/components/SessionRunner";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSessionDetail, lastSetsByExercise, listRoutineExerciseIds } from "@/lib/data";
import { safeBackHref, safeBackLabel } from "@/lib/navigation";
import SessionLoading from "./loading";

export const metadata: Metadata = { title: "Entrenamiento" };

export default function SessionPage({ params, searchParams }: PageProps<"/sesion/[id]">) {
  return (
    <Suspense fallback={<SessionLoading />}>
      <SessionContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SessionContent({ params, searchParams }: Pick<PageProps<"/sesion/[id]">, "params" | "searchParams">) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();
  const session = await getSessionDetail(user.id, sessionId);
  if (!session) notFound();
  const [last, routineExerciseIds] = await Promise.all([
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
        previous={previous}
        bodyWeightKg={user.bodyWeightKg}
        routineExerciseIds={routineExerciseIds}
        initialExerciseId={initialExerciseId}
      />
    </div>
  );
}
