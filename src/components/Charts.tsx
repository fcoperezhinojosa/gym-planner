"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

function Tip({ active, payload, label, unit }: Partial<TooltipContentProps<number, string>> & { unit?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-fg">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto font-semibold tabular">{Math.round(Number(p.value))}{unit ? ` ${unit}` : ""}</span>
        </p>
      ))}
      {payload.length > 1 && <p className="mt-1 border-t border-line pt-1 text-right font-semibold tabular">Total {Math.round(total)}{unit ? ` ${unit}` : ""}</p>}
    </div>
  );
}

/** kcal por semana: gimnasio + actividades (apiladas). */
export function WeeklyKcalChart({ data }: { data: { week: string; gym: number; activity: number }[] }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-1)" }} />Gimnasio</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-2)" }} />Otras actividades</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="week" {...axis} />
            <YAxis {...axis} width={48} />
            <Tooltip cursor={{ fill: "var(--card-2)" }} content={<Tip unit="kcal" />} />
            <Bar dataKey="gym" name="Gimnasio" stackId="k" fill="var(--series-1)" stroke="var(--card)" strokeWidth={2} />
            <Bar dataKey="activity" name="Otras actividades" stackId="k" fill="var(--series-2)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Gasto (basal + gimnasio + otras, apiladas) frente a lo consumido (línea). */
export function EnergyChart({
  data,
  perDay,
}: {
  data: { label: string; base: number; gym: number; other: number; intake: number | null }[];
  /** true si los valores son medias diarias de una semana/mes */
  perDay?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--muted)", opacity: 0.35 }} />Metabolismo</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-1)" }} />Gimnasio</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-2)" }} />Otras actividades</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: "var(--fg)" }} />Consumido</span>
        {perDay && <span className="ml-auto">media kcal/día</span>}
      </div>
      <div className="h-60">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k` : String(v))} />
            <Tooltip cursor={{ fill: "var(--card-2)" }} content={<EnergyTip perDay={perDay} />} />
            <Bar dataKey="base" name="Metabolismo" stackId="k" fill="var(--muted)" fillOpacity={0.35} stroke="var(--card)" strokeWidth={1} />
            <Bar dataKey="gym" name="Gimnasio" stackId="k" fill="var(--series-1)" stroke="var(--card)" strokeWidth={1} />
            <Bar dataKey="other" name="Otras actividades" stackId="k" fill="var(--series-2)" stroke="var(--card)" strokeWidth={1} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="intake" name="Consumido" stroke="var(--fg)" strokeWidth={2} connectNulls dot={{ r: 3, strokeWidth: 2, stroke: "var(--card)", fill: "var(--fg)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EnergyTip({ active, payload, label, perDay }: Partial<TooltipContentProps<number, string>> & { perDay?: boolean }) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k);
  const burned = ["base", "gym", "other"].reduce((a, k) => a + (Number(get(k)?.value) || 0), 0);
  const intake = get("intake")?.value;
  const fmt = (n: number) => Math.round(n).toLocaleString("es-ES");
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}{perDay && <span className="font-normal text-muted"> · media/día</span>}</p>
      {payload
        .filter((p) => p.dataKey !== "intake")
        .map((p) => (
          <p key={String(p.dataKey)} className="flex items-center gap-2">
            <span className="text-muted">{p.name}</span>
            <span className="ml-auto tabular">{fmt(Number(p.value))}</span>
          </p>
        ))}
      <p className="mt-1 flex gap-2 border-t border-line pt-1 font-semibold"><span>Gastado</span><span className="ml-auto tabular">{fmt(burned)} kcal</span></p>
      <p className="flex gap-2 font-semibold"><span>Consumido</span><span className="ml-auto tabular">{intake == null ? "—" : `${fmt(Number(intake))} kcal`}</span></p>
    </div>
  );
}

/** Una sola serie por semana (minutos, sesiones…). */
export function WeeklyBarChart({ data, unit, name }: { data: { week: string; value: number }[]; unit?: string; name: string }) {
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="week" {...axis} />
          <YAxis {...axis} width={48} allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--card-2)" }} content={<Tip unit={unit} />} />
          <Bar dataKey="value" name={name} fill="var(--series-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Evolución de un ejercicio: 1RM estimado y peso máximo por sesión. */
export function ProgressChart({ data }: { data: { date: string; oneRm: number; top: number }[] }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: "var(--series-1)" }} />1RM estimado</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: "var(--series-2)" }} />Peso máximo</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="date" {...axis} />
            <YAxis {...axis} width={48} domain={["auto", "auto"]} />
            <Tooltip cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} content={<Tip unit="kg" />} />
            <Line type="monotone" dataKey="oneRm" name="1RM estimado" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--series-1)" }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="top" name="Peso máximo" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--series-2)" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
