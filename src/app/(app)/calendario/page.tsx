import type { Metadata } from "next";
import Link from "next/link";
import { CalendarView } from "@/components/CalendarView";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCalendar, listRoutines } from "@/lib/data";
import { addDays, addMonths, daysInMonth, isValidISODate, isoWeekday, startOfMonth, todayISO } from "@/lib/dates";
import { MONTHS } from "@/lib/labels";
import { summarizeDays } from "@/lib/week";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayISO();
  const selected = isValidISODate(sp.d) ? sp.d : today;
  const month = isValidISODate(sp.m) ? startOfMonth(sp.m) : startOfMonth(selected);
  const lead = isoWeekday(month) - 1;
  const gridStart = addDays(month, -lead);
  const cells = Math.ceil((lead + daysInMonth(month)) / 7) * 7;
  const [days, routines] = await Promise.all([getCalendar(user.id, gridStart, cells), listRoutines(user.id)]);
  const inMonth = days.filter((d) => d.date.startsWith(month.slice(0, 7)));
  const sum = summarizeDays(inMonth, today);
  const [y, m] = month.split("-").map(Number);
  const routineOptions = routines.map((r) => ({ id: r.id, name: r.name, color: r.color }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${MONTHS[m - 1]} ${y}`}
        subtitle={`${sum.done} días entrenados · ${sum.minutes} min · ${sum.kcal.toLocaleString("es-ES")} kcal`}
        action={
          <div className="flex gap-1">
            {/* prefetch: los meses vecinos se cargan en segundo plano para que el cambio de mes sea instantáneo */}
            <Link prefetch className="rounded-lg px-3 py-2 text-sm hover:bg-card-2" href={`/calendario?m=${addMonths(month, -1)}`} aria-label="Mes anterior">←</Link>
            <Link className="rounded-lg px-3 py-2 text-sm hover:bg-card-2" href="/calendario">Hoy</Link>
            <Link prefetch className="rounded-lg px-3 py-2 text-sm hover:bg-card-2" href={`/calendario?m=${addMonths(month, 1)}`} aria-label="Mes siguiente">→</Link>
          </div>
        }
      />
      <CalendarView days={days} month={month} today={today} routines={routineOptions} bodyWeightKg={user.bodyWeightKg} />
    </div>
  );
}
