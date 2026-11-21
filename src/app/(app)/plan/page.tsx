import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";
import Link from "next/link";
import { PlanEditor } from "@/components/PlanEditor";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getActivePlan, listRoutineOptions } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { weekIndexFor } from "@/lib/schedule";

export const metadata: Metadata = { title: "Plan semanal" };

async function PlanEditorSection({
  plan,
  routines,
}: {
  plan: Awaited<ReturnType<typeof getActivePlan>>;
  routines: Awaited<ReturnType<typeof listRoutineOptions>>;
}) {
  await io();
  const today = todayISO();
  return (
    <PlanEditor
      plan={plan}
      routines={routines}
      today={today}
      currentWeek={plan ? weekIndexFor(today, plan) : null}
    />
  );
}

export default async function PlanPage() {
  const user = await requireUser();
  const [plan, routines] = await Promise.all([getActivePlan(user.id), listRoutineOptions(user.id)]);
  return (
    <div>
      <PageHeader
        title="Plan semanal"
        subtitle={
          <>
            Define qué toca cada día. Con un ciclo de 2 semanas puedes alternar, por ejemplo, pecho bajo (A) y pecho alto (B).
            {routines.length === 0 && <> Primero <Link className="font-semibold text-accent-text hover:underline" href="/rutinas">crea rutinas</Link>.</>}
          </>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card-2" />}>
        <PlanEditorSection plan={plan} routines={routines} />
      </Suspense>
    </div>
  );
}
