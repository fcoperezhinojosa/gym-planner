import { TIME_ZONE } from "./dates";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Devuelve la fecha 'YYYY-MM-DD' y la hora local (0–23) para `now` en la zona horaria dada. */
export function localHourAndDate(now: Date, timeZone: string): { date: string; hour: number } {
  const tz = isValidTimeZone(timeZone) ? timeZone : TIME_ZONE;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
  };
}

export type ReminderCheckInput = {
  now: Date;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderTimeZone: string;
  reminderLastSentDate: string | null;
  hasActivityOrWorkoutToday: boolean;
  hasIntakeToday: boolean;
};

export type ReminderDecision = {
  shouldSend: boolean;
  today: string;
  missingIntake: boolean;
  missingActivity: boolean;
};

/**
 * Decide si toca enviar el recordatorio diario al usuario en este momento.
 * Solo avisa cuando:
 * - el recordatorio está activo,
 * - coincide la hora local configurada,
 * - aún no se ha enviado hoy,
 * - y falta registrar kcal comidas o alguna actividad/entreno hoy.
 */
export function shouldSendDailyReminder(input: ReminderCheckInput): ReminderDecision {
  const { date: today, hour } = localHourAndDate(input.now, input.reminderTimeZone);
  const missingIntake = !input.hasIntakeToday;
  const missingActivity = !input.hasActivityOrWorkoutToday;

  if (!input.reminderEnabled) {
    return { shouldSend: false, today, missingIntake, missingActivity };
  }
  if (hour !== input.reminderHour) {
    return { shouldSend: false, today, missingIntake, missingActivity };
  }
  if (input.reminderLastSentDate === today) {
    return { shouldSend: false, today, missingIntake, missingActivity };
  }
  if (!missingIntake && !missingActivity) {
    return { shouldSend: false, today, missingIntake, missingActivity };
  }
  return { shouldSend: true, today, missingIntake, missingActivity };
}

export function buildReminderPayload({
  missingIntake,
  missingActivity,
}: {
  missingIntake: boolean;
  missingActivity: boolean;
}): PushPayload {
  if (missingIntake && missingActivity) {
    return {
      title: "Cierre del día",
      body: "¿Has caminado o entrenado hoy? Registra tu actividad y las kcal en un momento.",
      url: "/cierre",
      tag: "daily-reminder",
    };
  }
  if (missingIntake) {
    return {
      title: "Te faltan las kcal de hoy",
      body: "Añade las kcal comidas para cerrar el balance de hoy.",
      url: "/cierre",
      tag: "daily-reminder",
    };
  }
  return {
    title: "¿Algo de actividad hoy?",
    body: "Si has caminado o hecho ejercicio, regístralo antes de cerrar el día.",
    url: "/cierre",
    tag: "daily-reminder",
  };
}
