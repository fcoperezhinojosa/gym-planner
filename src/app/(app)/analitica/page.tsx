import type { Metadata } from "next";
import Link from "next/link";
import { WeeklyBarChart, WeeklyKcalChart } from "@/components/Charts";
import { EnergyBalance } from "@/components/EnergyBalance";
import { Card, PageHeader, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { completedSetsInRange, getCalendar, getEnergyDays } from "@/lib/data";
import { addDays, diffDays, formatShort, startOfWeek, todayISO } from "@/lib/dates";
import { baseDailyKcal, basalKcal, periodStart } from "@/lib/energy";
import { MUSCLE_GROUPS, muscleGroup, type MuscleGroup } from "@/lib/labels";
import { epley1RM, weekStreak } from "@/lib/stats";
import { summarizeDays } from "@/lib/week";

export const metadata: Metadata = { title: "Analítica" };

const WEEKS = 12;

export default async function AnalyticsPage() {
  const user = await requireUser();
  const today = todayISO();
  const thisWeek = startOfWeek(today);
  const from = addDays(thisWeek, -7 * (WEEKS - 1));
  // Balance energético: hasta 6 meses atrás (lo máximo que muestra la vista "Mes").
  const energyFrom = [periodStart(today, "month", 6), periodStart(today, "week", 12)].sort()[0];
  const [days, sets, energyDays] = await Promise.all([
    getCalendar(user.id, from, WEEKS * 7),
    completedSetsInRange(user.id, from, addDays(thisWeek, 6)),
    getEnergyDays(user.id, energyFrom, diffDays(today, energyFrom) + 1),
  ]);
  const bmr = basalKcal({
    sex: user.sex,
    age: user.birthYear ? Number(today.slice(0, 4)) - user.birthYear : null,
    heightCm: user.heightCm,
    weightKg: user.bodyWeightKg,
  });

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = addDays(from, i * 7);
    const wd = days.slice(i * 7, i * 7 + 7);
    const sum = summarizeDays(wd, today);
    const kcalGym = wd.reduce(
      (a, d) => a + d.sessions.reduce((x, s) => x + (s.kcal ?? 0), 0) + d.activities.reduce((x, s) => x + (s.type === "gym" ? s.kcal : 0), 0),
      0,
    );
    return { start, label: formatShort(start), ...sum, kcalGym, kcalAct: sum.kcal - kcalGym };
  });
  const cur = weeks[weeks.length - 1];
  const past = weeks.slice(0, -1).filter((w) => w.done > 0 || w.planned > 0);
  const avg = (f: (w: (typeof weeks)[number]) => number) => (past.length ? Math.round(past.reduce((a, w) => a + f(w), 0) / past.length) : 0);
  const streak = weekStreak(weeks.map((w) => ({ done: w.done, planned: w.planned })));
  const adherence = (() => {
    const p = weeks.reduce((a, w) => a + w.plannedToDate, 0);
    const d = weeks.reduce((a, w) => a + Math.min(w.done, w.plannedToDate), 0);
    return p ? Math.round((d / p) * 100) : null;
  })();

  // Series y volumen por grupo muscular: últimas 4 semanas (media semanal)
  const last4 = addDays(thisWeek, -21);
  const groupStats = new Map<MuscleGroup, { sets: number; volume: number; lastDate: string | null }>();
  for (const g of Object.keys(MUSCLE_GROUPS) as MuscleGroup[]) groupStats.set(g, { sets: 0, volume: 0, lastDate: null });
  for (const s of sets) {
    const g = groupStats.get(muscleGroup(s.muscle))!;
    if (s.date >= last4) {
      g.sets++;
      g.volume += s.reps * s.weightKg;
    }
    if (!g.lastDate || s.date > g.lastDate) g.lastDate = s.date;
  }
  const maxSets = Math.max(1, ...[...groupStats.values()].map((g) => g.sets));

  // Récords: mejor 1RM estimado por ejercicio
  const prs = new Map<string, { name: string; oneRm: number; weight: number; reps: number; date: string }>();
  for (const s of sets) {
    if (s.weightKg <= 0) continue;
    const rm = epley1RM(s.weightKg, s.reps);
    const p = prs.get(s.exerciseId);
    if (!p || rm > p.oneRm) prs.set(s.exerciseId, { name: s.exerciseName, oneRm: rm, weight: s.weightKg, reps: s.reps, date: s.date });
  }
  const topPrs = [...prs.entries()].sort((a, b) => b[1].oneRm - a[1].oneRm).slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader title="Analítica" subtitle={`Últimas ${WEEKS} semanas`} />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Esta semana" value={`${cur.done}/${cur.planned}`} hint="días entrenados / plan" />
        <Stat label="Kcal esta semana" value={cur.kcal.toLocaleString("es-ES")} hint={`media ${avg((w) => w.kcal).toLocaleString("es-ES")}`} />
        <Stat label="Minutos esta semana" value={cur.minutes} hint={`media ${avg((w) => w.minutes)}`} />
        <Stat label="Racha" value={`${streak} sem.`} hint={adherence !== null ? `cumplimiento ${adherence}%` : "cumpliendo el plan"} />
      </section>

      <EnergyBalance
        days={energyDays}
        today={today}
        base={baseDailyKcal(bmr.kcal)}
        bmr={bmr.kcal}
        bmrExact={bmr.exact}
        defaultIntake={user.dailyIntakeKcal}
      />

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Kcal de ejercicio por semana <span className="text-xs font-normal text-muted">(estimadas)</span></h2>
        <WeeklyKcalChart data={weeks.map((w) => ({ week: w.label, gym: w.kcalGym, activity: w.kcalAct }))} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Días entrenados</h2>
          <WeeklyBarChart name="Días" data={weeks.map((w) => ({ week: w.label, value: w.done }))} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Minutos activos</h2>
          <WeeklyBarChart name="Minutos" unit="min" data={weeks.map((w) => ({ week: w.label, value: w.minutes }))} />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold">Series por grupo muscular</h2>
        <p className="mb-3 text-xs text-muted">Últimas 4 semanas · media semanal · días desde el último entreno</p>
        <ul className="space-y-2.5">
          {[...groupStats.entries()].map(([g, v]) => {
            const since = v.lastDate ? diffDays(today, v.lastDate) : null;
            return (
              <li key={g} className="grid grid-cols-[5rem_1fr_6.5rem] items-center gap-3 text-sm">
                <span className="font-medium">{MUSCLE_GROUPS[g].label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-card-2">
                  <span className="block h-full rounded-full" style={{ width: `${(v.sets / maxSets) * 100}%`, background: "var(--series-1)" }} />
                </span>
                <span className="text-right text-xs text-muted tabular">
                  {(v.sets / 4).toFixed(1)} series · {since === null ? "—" : since === 0 ? "hoy" : `${since} d`}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">Referencia habitual para hipertrofia: 10–20 series semanales por grupo.</p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Mejores marcas (1RM estimado)</h2>
        {topPrs.length === 0 ? (
          <p className="text-sm text-muted">Termina algún entrenamiento para ver tus récords.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="tabular">
              {topPrs.map(([id, p]) => (
                <tr key={id} className="border-t border-line first:border-0">
                  <td className="py-1.5"><Link className="hover:text-accent" href={`/ejercicios/${encodeURIComponent(id)}`}>{p.name}</Link></td>
                  <td className="text-right text-xs text-muted">{p.weight} kg × {p.reps}</td>
                  <td className="w-20 text-right font-semibold">{p.oneRm} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto p-4">
        <h2 className="mb-2 font-semibold">Tabla semanal</h2>
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="py-1 font-medium">Semana</th><th className="font-medium">Días</th><th className="font-medium">Gym</th><th className="font-medium">Otras</th><th className="font-medium">Min</th><th className="text-right font-medium">Kcal</th></tr>
          </thead>
          <tbody className="tabular">
            {[...weeks].reverse().map((w) => (
              <tr key={w.start} className="border-t border-line">
                <td className="py-1.5">{w.label}</td><td>{w.done}/{w.planned}</td><td>{w.gymSessions}</td><td>{w.activities}</td><td>{w.minutes}</td><td className="text-right">{w.kcal.toLocaleString("es-ES")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
