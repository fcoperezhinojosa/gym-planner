import type { Metadata } from "next";
import { CalendarView } from "@/components/CalendarView";
import { requireUser } from "@/lib/auth";
import { getCalendar, listRoutineOptions } from "@/lib/data";
import { addDays, daysInMonth, isValidISODate, isoWeekday, startOfMonth, todayISO } from "@/lib/dates";
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
  const [days, routineOptions] = await Promise.all([getCalendar(user.id, gridStart, cells), listRoutineOptions(user.id)]);
  const inMonth = days.filter((d) => d.date.startsWith(month.slice(0, 7)));
  const sum = summarizeDays(inMonth, today);

  return (
    <CalendarView
      key={month}
      month={month}
      today={today}
      initialSelected={selected}
      days={days}
      routineOptions={routineOptions}
      summary={sum}
    />
  );
}
