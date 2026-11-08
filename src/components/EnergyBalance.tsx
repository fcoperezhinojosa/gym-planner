"use client";

import { useActionState, useMemo, useState } from "react";
import { logIntake } from "@/app/actions";
import { aggregateEnergy, energyVerdict, periodStart, type EnergyDay, type Period } from "@/lib/energy";
import { EnergyChart } from "./Charts";
import { Button, Card, cx, input, label } from "./ui";

const PERIODS: { id: Period; label: string; count: number; unit: string }[] = [
  { id: "day", label: "Día", count: 14, unit: "Hoy" },
  { id: "week", label: "Semana", count: 12, unit: "Esta semana" },
  { id: "month", label: "Mes", count: 6, unit: "Este mes" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("es-ES");
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;

const TONE: Record<string, string> = {
  good: "border-good/40 bg-good/10",
  warn: "border-accent/40 bg-accent-soft",
  danger: "border-danger/40 bg-danger/10",
  neutral: "border-line bg-card-2",
};

export function EnergyBalance({
  days,
  today,
  base,
  bmr,
  bmrExact,
  defaultIntake,
}: {
  days: EnergyDay[];
  today: string;
  base: number;
  bmr: number;
  bmrExact: boolean;
  defaultIntake: number | null;
}) {
  const [period, setPeriod] = useState<Period>("week");
  const p = PERIODS.find((x) => x.id === period)!;

  const buckets = useMemo(() => {
    const from = periodStart(today, period, p.count);
    return aggregateEnergy(
      days.filter((d) => d.date >= from && d.date <= today),
      period,
      base,
      defaultIntake,
    );
  }, [days, today, period, p.count, base, defaultIntake]);

  const cur = buckets[buckets.length - 1];
  // Veredicto sobre el periodo actual (hoy / esta semana / este mes), en media diaria.
  const avgBalance = cur && cur.balance !== null && cur.intakeDays ? cur.balance / cur.intakeDays : null;
  const avgBurned = cur ? cur.burned / Math.max(1, cur.days) : 0;
  const verdict = energyVerdict(avgBalance);
  const todayLog = days.find((d) => d.date === today)?.intake ?? null;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          Balance de kcal <span className="text-xs font-normal text-muted">(estimado)</span>
        </h2>
        <div role="tablist" className="flex rounded-xl bg-card-2 p-0.5 text-sm">
          {PERIODS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={period === x.id}
              type="button"
              onClick={() => setPeriod(x.id)}
              className={cx("rounded-lg px-3 py-1", period === x.id ? "bg-card font-semibold shadow-sm" : "text-muted")}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {cur && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-card-2 p-3">
            <p className="text-xs text-muted">{p.unit} gastado</p>
            <p className="text-xl font-bold tabular">{fmt(cur.burned)}</p>
            <p className="text-xs text-muted tabular">ejercicio {fmt(cur.gym + cur.other)}</p>
          </div>
          <div className="rounded-xl bg-card-2 p-3">
            <p className="text-xs text-muted">{p.unit} consumido</p>
            <p className="text-xl font-bold tabular">{cur.intake === null ? "—" : fmt(cur.intake)}</p>
            <p className="text-xs text-muted tabular">
              {cur.intake === null ? "sin datos" : cur.intakeDays < cur.days ? `${cur.intakeDays}/${cur.days} días` : "kcal"}
            </p>
          </div>
          <div className="rounded-xl bg-card-2 p-3">
            <p className="text-xs text-muted">Balance</p>
            <p className={cx("text-xl font-bold tabular", cur.balance !== null && (cur.balance > 0 ? "text-accent" : "text-good"))}>
              {cur.balance === null ? "—" : signed(cur.balance)}
            </p>
            <p className="text-xs text-muted">{cur.balance === null ? "" : cur.balance > 0 ? "superávit" : "déficit"}</p>
          </div>
        </div>
      )}

      {/* Media diaria por bucket: así un mes/semana a medias se compara bien con los completos. */}
      <EnergyChart
        perDay={period !== "day"}
        data={buckets.map((b) => ({
          label: b.label,
          base: b.base / b.days,
          gym: b.gym / b.days,
          other: b.other / b.days,
          intake: b.intake === null ? null : b.intake / b.intakeDays,
        }))}
      />

      <div className={cx("rounded-xl border p-3", TONE[verdict.tone])}>
        <p className="text-sm font-semibold">{verdict.title}</p>
        <p className="text-sm text-muted">{verdict.text}</p>
        <p className="mt-1 text-xs text-muted">
          {p.unit} · gasto medio {fmt(avgBurned)} kcal/día
        </p>
      </div>

      <IntakeForm today={today} current={todayLog} defaultIntake={defaultIntake} />

      <p className="text-xs text-muted">
        Metabolismo basal ≈ {fmt(bmr)} kcal × 1,2 (vida diaria) = {fmt(base)} kcal/día, más lo que gastas entrenando.
        {!bmrExact && " Completa sexo, año de nacimiento y altura en tu perfil para afinarlo."}
        {" "}Son estimaciones orientativas, no mediciones.
      </p>
    </Card>
  );
}

function IntakeForm({ today, current, defaultIntake }: { today: string; current: number | null; defaultIntake: number | null }) {
  const [state, action, pending] = useActionState(logIntake, undefined);
  return (
    <form action={action} className="grid grid-cols-2 items-end gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <label className={label} htmlFor="intake-date">Día</label>
        <input id="intake-date" name="date" type="date" max={today} defaultValue={today} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="intake-kcal">kcal comidas</label>
        <input
          id="intake-kcal"
          name="kcal"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={defaultIntake ? String(defaultIntake) : "2200"}
          defaultValue={current ?? ""}
          className={input}
        />
      </div>
      <Button disabled={pending} className="col-span-2 sm:col-span-1">Guardar</Button>
      {state?.error && <p className="col-span-2 text-sm text-danger sm:col-span-3">{state.error}</p>}
      {state?.ok && <p className="col-span-2 text-sm text-good sm:col-span-3">Guardado ✓ (deja vacío para borrar el registro de ese día)</p>}
    </form>
  );
}
