import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { ActivityForm } from "@/components/ActivityForm";
import { DeleteActivityButton } from "@/components/DeleteActivityButton";
import { Card, PageHeader } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatShort, todayISO } from "@/lib/dates";
import { INTENSITIES, activityEmoji, activityLabel, type Intensity } from "@/lib/kcal";

export const metadata: Metadata = { title: "Actividades" };

export default async function ActivitiesPage() {
  const user = await requireUser();
  const db = await getDb();
  const list = await db.select().from(s.activities).where(eq(s.activities.userId, user.id)).orderBy(desc(s.activities.date), desc(s.activities.id)).limit(50);
  return (
    <div className="space-y-4">
      <PageHeader title="Actividades" subtitle="Gimnasio, pádel, caminar, elíptica… todo suma a tus kcal gastadas." />
      <Card className="p-4">
        <ActivityForm today={todayISO()} bodyWeightKg={user.bodyWeightKg} />
      </Card>
      <ul className="space-y-2">
        {list.map((a) => (
          <li key={a.id}>
            <Card className="flex items-center gap-3 p-3">
              <span className="text-2xl">{activityEmoji(a.type)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{activityLabel(a.type)} · {formatShort(a.date)}</span>
                <span className="block text-xs text-muted">
                  {a.durationMin} min · {INTENSITIES[a.intensity as Intensity] ?? a.intensity} · {a.kcal} kcal{a.notes ? ` · ${a.notes}` : ""}
                </span>
              </span>
              <DeleteActivityButton id={a.id} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
