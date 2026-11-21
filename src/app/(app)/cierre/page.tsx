import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";
import Link from "next/link";
import { QuickActivityCard, QuickIntakeCard } from "@/components/DailyCheckinForms";
import { DeleteActivityButton } from "@/components/DeleteActivityButton";
import { DeleteWorkoutButton } from "@/components/DeleteWorkoutButton";
import { Card, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCalendarAndEnergy } from "@/lib/data";
import { isoWeekday, todayISO } from "@/lib/dates";
import { activityEmoji, activityLabel } from "@/lib/kcal";
import { MONTHS, WEEKDAYS } from "@/lib/labels";
import DailyCheckinLoading from "./loading";

export const metadata: Metadata = { title: "Cierre del día" };

async function DailyCheckinContent() {
  const user = await requireUser();
  await io();
  const today = todayISO(new Date(), user.reminderTimeZone);
  const { calendar, energy } = await getCalendarAndEnergy(user.id, today, 1, today, 1);
  const day = calendar[0];
  const energyDay = energy[0];

  const [, m, d] = today.split("-").map(Number);
  const wd = isoWeekday(today) - 1;
  const dateLabel = `${WEEKDAYS[wd]}, ${d} de ${MONTHS[m - 1].toLowerCase()}`;

  const finishedSessions = day?.sessions.filter((s) => s.finished) ?? [];
  const todayActivities = day?.activities ?? [];
  const totalBurned =
    finishedSessions.reduce((acc, s) => acc + (s.kcal ?? 0), 0) +
    todayActivities.reduce((acc, a) => acc + a.kcal, 0);
  const totalItems = finishedSessions.length + todayActivities.length;
  const todayIntake = energyDay?.intake ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cierre del día"
        subtitle={dateLabel}
        action={
          <Link href="/" className="text-sm font-semibold text-accent-text hover:underline">
            Ir a Hoy
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2.5">
        <div
          className={cx(
            "rounded-2xl border p-3.5",
            todayIntake !== null ? "border-good/40 bg-good/10" : "border-line bg-card",
          )}
        >
          <span className="block text-xs font-medium text-muted">Kcal comidas</span>
          <span className="mt-0.5 block font-display text-xl font-bold tabular">
            {todayIntake !== null ? `${todayIntake.toLocaleString("es-ES")} kcal` : "Pendiente"}
          </span>
        </div>
        <div
          className={cx(
            "rounded-2xl border p-3.5",
            totalItems > 0 ? "border-good/40 bg-good/10" : "border-line bg-card",
          )}
        >
          <span className="block text-xs font-medium text-muted">Actividad hoy</span>
          <span className="mt-0.5 block font-display text-xl font-bold tabular">
            {totalItems > 0 ? `${totalBurned.toLocaleString("es-ES")} kcal` : "Sin registrar"}
          </span>
        </div>
      </div>

      <QuickIntakeCard today={today} currentKcal={todayIntake} defaultIntake={user.dailyIntakeKcal} />

      <QuickActivityCard today={today} bodyWeightKg={user.bodyWeightKg} heightCm={user.heightCm} />

      {totalItems > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Registrado hoy</h2>
          <ul className="space-y-2">
            {finishedSessions.map((s) => (
              <li key={`s-${s.id}`}>
                <Card className="flex items-center gap-3 p-3">
                  <span className="text-2xl">🏋️</span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/sesion/${s.id}`} className="block truncate text-sm font-medium hover:underline">
                      {s.name}
                    </Link>
                    <span className="block text-xs text-muted">
                      {s.durationMin ?? 0} min · {s.kcal ?? 0} kcal
                    </span>
                  </span>
                  <DeleteWorkoutButton id={s.id} label={s.name} />
                </Card>
              </li>
            ))}
            {todayActivities.map((a) => (
              <li key={`a-${a.id}`}>
                <Card className="flex items-center gap-3 p-3">
                  <span className="text-2xl">{activityEmoji(a.type)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{activityLabel(a.type)}</span>
                    <span className="block text-xs text-muted">
                      {a.durationMin} min · {a.kcal} kcal
                    </span>
                  </span>
                  <DeleteActivityButton id={a.id} label={activityLabel(a.type)} />
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function DailyCheckinPage() {
  return (
    <Suspense fallback={<DailyCheckinLoading />}>
      <DailyCheckinContent />
    </Suspense>
  );
}
