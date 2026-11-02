import type { Metadata } from "next";
import Link from "next/link";
import { PlanEditor } from "@/components/PlanEditor";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getActivePlan, listRoutines } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { weekIndexFor } from "@/lib/schedule";

export const metadata: Metadata = { title: "Plan semanal" };

export default async function PlanPage() {
  const user = await requireUser();
  const [plan, routines] = await Promise.all([getActivePlan(user.id), listRoutines(user.id)]);
  const today = todayISO();
  return (
    <div>
      <PageHeader
        title="Plan semanal"
        subtitle={
          <>
            Define qué toca cada día. Con un ciclo de 2 semanas puedes alternar, por ejemplo, pecho bajo (A) y pecho alto (B).
            {routines.length === 0 && <> Primero <Link className="text-accent" href="/rutinas">crea rutinas</Link>.</>}
          </>
        }
      />
      <PlanEditor
        plan={plan}
        routines={routines.map((r) => ({ id: r.id, name: r.name, color: r.color }))}
        today={today}
        currentWeek={plan ? weekIndexFor(today, plan) : null}
      />
    </div>
  );
}
