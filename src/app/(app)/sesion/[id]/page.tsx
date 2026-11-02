import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionRunner } from "@/components/SessionRunner";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSessionDetail, lastSetsByExercise, listExercisesLite } from "@/lib/data";

export const metadata: Metadata = { title: "Entrenamiento" };

export default async function SessionPage({ params }: PageProps<"/sesion/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();
  const session = await getSessionDetail(user.id, sessionId);
  if (!session) notFound();
  const [exercises, last] = await Promise.all([
    listExercisesLite(user.id),
    lastSetsByExercise(user.id, session.exercises.map((e) => e.exerciseId), session.id),
  ]);
  const previous = Object.fromEntries(last);
  const [y, m, d] = session.date.split("-");
  return (
    <div>
      <Link href={session.endedAt ? `/calendario?d=${session.date}` : "/"} className="mb-3 inline-block text-sm text-muted hover:text-fg">←  Volver</Link>
      <PageHeader title={session.name} subtitle={`${d}/${m}/${y}${session.endedAt ? " · terminado" : " · en curso"}`} />
      <SessionRunner key={`${session.id}-${session.endedAt ? 1 : 0}`} session={session} exercises={exercises} previous={previous} bodyWeightKg={user.bodyWeightKg} />
    </div>
  );
}
