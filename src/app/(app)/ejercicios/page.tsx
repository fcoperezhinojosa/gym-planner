import type { Metadata } from "next";
import { Suspense } from "react";
import { ExercisesCatalog } from "@/components/ExercisesCatalog";
import { requireUser } from "@/lib/auth";
import { listExercisesLite } from "@/lib/data";

export const metadata: Metadata = { title: "Ejercicios" };

export default async function ExercisesPage() {
  const user = await requireUser();
  const all = await listExercisesLite(user.id);

  return (
    <Suspense>
      <ExercisesCatalog exercises={all} />
    </Suspense>
  );
}
