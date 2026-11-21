import "server-only";
import * as webpush from "web-push";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import {
  buildReminderPayload,
  localHourAndDate,
  shouldSendDailyReminder,
  type PushPayload,
} from "./reminders";

let vapidInitialized = false;

function cleanEnv(value: string | undefined): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

export function getVapidPublicKey(): string {
  return cleanEnv(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

export function isPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && cleanEnv(process.env.VAPID_PRIVATE_KEY));
}

function normalizeVapidSubject(raw: string): string {
  if (!raw) return "mailto:admin@gym-planner.local";
  if (raw.startsWith("mailto:") || raw.startsWith("https://") || raw.startsWith("http://")) {
    return raw;
  }
  if (raw.includes("@")) return `mailto:${raw}`;
  return raw;
}

function ensureVapid() {
  if (vapidInitialized) return;
  const publicKey = getVapidPublicKey();
  const privateKey = cleanEnv(process.env.VAPID_PRIVATE_KEY);
  const subject = normalizeVapidSubject(cleanEnv(process.env.VAPID_SUBJECT));
  if (!publicKey || !privateKey) {
    throw new Error("Faltan las claves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidInitialized = true;
}

export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
): Promise<{ sent: number; removed: number; failed: number; lastError?: string }> {
  ensureVapid();
  const db = await getDb();
  const subs = await db
    .select()
    .from(s.pushSubscriptions)
    .where(eq(s.pushSubscriptions.userId, userId));

  if (subs.length === 0) return { sent: 0, removed: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;
  let failed = 0;
  let lastError: string | undefined;
  const now = new Date();

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 6 },
        );
        sent += 1;
        await db
          .update(s.pushSubscriptions)
          .set({ lastUsedAt: now })
          .where(eq(s.pushSubscriptions.id, sub.id));
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          removed += 1;
          await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id));
        } else {
          failed += 1;
          const msg = err instanceof Error ? err.message : String(err);
          const errBody =
            typeof err === "object" &&
            err !== null &&
            "body" in err &&
            typeof (err as { body?: unknown }).body === "string"
              ? (err as { body: string }).body.trim().slice(0, 200)
              : "";
          lastError = statusCode
            ? `HTTP ${statusCode}${errBody ? `: ${errBody}` : `: ${msg}`}`
            : msg;
          console.error(`[push] Error enviando notificación a sub ${sub.id}:`, err);
        }
      }
    }),
  );

  return { sent, removed, failed, lastError };
}

/**
 * Revisa todos los usuarios con recordatorio activo y al menos una suscripción push,
 * y les envía el recordatorio si coincide su hora local y hoy les falta registrar kcal o actividad.
 */
export async function runDailyReminders(now: Date = new Date()): Promise<{
  checked: number;
  notified: number;
  skipped: number;
  failed: number;
}> {
  if (!isPushConfigured()) {
    return { checked: 0, notified: 0, skipped: 0, failed: 0 };
  }
  const db = await getDb();

  const subUsers = await db
    .selectDistinct({ userId: s.pushSubscriptions.userId })
    .from(s.pushSubscriptions);
  if (subUsers.length === 0) {
    return { checked: 0, notified: 0, skipped: 0, failed: 0 };
  }

  const candidateUsers = await db
    .select({
      id: s.users.id,
      reminderEnabled: s.users.reminderEnabled,
      reminderHour: s.users.reminderHour,
      reminderTimeZone: s.users.reminderTimeZone,
      reminderLastSentDate: s.users.reminderLastSentDate,
    })
    .from(s.users)
    .where(
      and(
        eq(s.users.reminderEnabled, true),
        inArray(
          s.users.id,
          subUsers.map((r) => r.userId),
        ),
      ),
    );

  let notified = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of candidateUsers) {
    const { date: today, hour } = localHourAndDate(now, user.reminderTimeZone);
    if (hour !== user.reminderHour || user.reminderLastSentDate === today) {
      skipped += 1;
      continue;
    }

    const [todayActivities, todayWorkouts, todayIntake] = await Promise.all([
      db
        .select({ id: s.activities.id })
        .from(s.activities)
        .where(and(eq(s.activities.userId, user.id), eq(s.activities.date, today)))
        .limit(1),
      db
        .select({ id: s.workoutSessions.id })
        .from(s.workoutSessions)
        .where(
          and(
            eq(s.workoutSessions.userId, user.id),
            eq(s.workoutSessions.date, today),
            isNotNull(s.workoutSessions.endedAt),
          ),
        )
        .limit(1),
      db
        .select({ id: s.intakeLogs.id })
        .from(s.intakeLogs)
        .where(and(eq(s.intakeLogs.userId, user.id), eq(s.intakeLogs.date, today)))
        .limit(1),
    ]);

    const decision = shouldSendDailyReminder({
      now,
      reminderEnabled: user.reminderEnabled,
      reminderHour: user.reminderHour,
      reminderTimeZone: user.reminderTimeZone,
      reminderLastSentDate: user.reminderLastSentDate,
      hasActivityOrWorkoutToday: todayActivities.length > 0 || todayWorkouts.length > 0,
      hasIntakeToday: todayIntake.length > 0,
    });

    if (!decision.shouldSend) {
      skipped += 1;
      continue;
    }

    const payload = buildReminderPayload({
      missingIntake: decision.missingIntake,
      missingActivity: decision.missingActivity,
    });

    const result = await sendPushToUser(user.id, payload);
    if (result.sent > 0) {
      notified += 1;
      await db
        .update(s.users)
        .set({ reminderLastSentDate: decision.today })
        .where(eq(s.users.id, user.id));
    } else if (result.failed > 0) {
      failed += 1;
    } else {
      skipped += 1;
    }
  }

  return { checked: candidateUsers.length, notified, skipped, failed };
}
