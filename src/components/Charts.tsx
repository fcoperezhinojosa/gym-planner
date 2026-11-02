"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
