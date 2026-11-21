"use server";

import bcrypt from "bcryptjs";
import { and, asc, desc, eq, gte, inArray, isNull, max, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { getDb, schema as s, type DB } from "@/db";
import { endSession, requireUser, startSession } from "@/lib/auth";
import { isValidISODate, todayISO } from "@/lib/dates";
import {
  ACTIVITY_TYPES,
  estimateKcal,
  estimateWalkingKcalFromKm,
  isIntensity,
  metFor,
  stepsToKm,
  walkingDurationMin,
  type Intensity,
} from "@/lib/kcal";
import { isSex } from "@/lib/energy";
import { normalizeSlot } from "@/lib/schedule";
import { generateToken } from "@/lib/api-tokens";
import { cacheTags } from "@/lib/cache-tags";
import { lastSetsByExercise } from "@/lib/data";
import { isValidTimeZone } from "@/lib/reminders";

export type FormState = { error?: string; ok?: boolean } | undefined;

const num = (v: FormDataEntryValue | null, fallback = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ───────────── Auth ───────────── */

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form.get("email")).toLowerCase();
  const password = str(form.get("password"));
  const db = await getDb();
  const [u] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return { error: "Email o contraseña incorrectos" };
  await startSession(u.id);
  redirect("/");
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form.get("name"));
  const email = str(form.get("email")).toLowerCase();
  const password = str(form.get("password"));
  const invite = str(form.get("invite"));
  const bodyWeightKg = clamp(num(form.get("weight"), 75), 30, 250);
  if (process.env.INVITE_CODE && invite !== process.env.INVITE_CODE) return { error: "Código de invitación incorrecto" };
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Nombre y email válidos, por favor" };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  const db = await getDb();
  const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
  if (exists) return { error: "Ya existe una cuenta con ese email" };
  const [u] = await db
    .insert(s.users)
    .values({ name, email, bodyWeightKg, passwordHash: await bcrypt.hash(password, 10) })
    .returning({ id: s.users.id });
  await startSession(u.id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(form.get("name")) || user.name;
  const bodyWeightKg = clamp(num(form.get("weight"), user.bodyWeightKg), 30, 250);
  const sexRaw = str(form.get("sex"));
  const sex = isSex(sexRaw) ? sexRaw : null;
  const optInt = (k: string, min: number, max: number) => {
    const v = Math.round(num(form.get(k), NaN));
    return Number.isFinite(v) && v >= min && v <= max ? v : null;
  };
  const thisYear = Number(todayISO().slice(0, 4));
  const birthYear = optInt("birthYear", thisYear - 100, thisYear - 12);
  const heightCm = optInt("heightCm", 120, 230);
  const dailyIntakeKcal = optInt("dailyIntakeKcal", 800, 6000);
  const defaultRestSeconds = clamp(Math.round(num(form.get("defaultRestSeconds"), 60)), 0, 600);
  const db = await getDb();
  await db.update(s.users).set({ name, bodyWeightKg, sex, birthYear, heightCm, dailyIntakeKcal, defaultRestSeconds }).where(eq(s.users.id, user.id));
  updateTag(cacheTags.userProfile(user.id));
  refresh();
  return { ok: true };
}

/* ───────────── Ownership helpers ───────────── */

async function ownRoutine(userId: number, routineId: number) {
  const db = await getDb();
  const [r] = await db.select({ id: s.routines.id }).from(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.userId, userId)));
  if (!r) throw new Error("Rutina no encontrada");
}

async function ownRoutineExercise(userId: number, reId: number) {
  const db = await getDb();
  const [r] = await db
    .select({ id: s.routineExercises.id, routineId: s.routineExercises.routineId })
    .from(s.routineExercises)
    .innerJoin(s.routines, eq(s.routines.id, s.routineExercises.routineId))
    .where(and(eq(s.routineExercises.id, reId), eq(s.routines.userId, userId)));
  if (!r) throw new Error("Ejercicio no encontrado");
  return r;
}

async function ownSession(userId: number, sessionId: number) {
  const db = await getDb();
  const [r] = await db
    .select()
    .from(s.workoutSessions)
    .where(and(eq(s.workoutSessions.id, sessionId), eq(s.workoutSessions.userId, userId)));
  if (!r) throw new Error("Sesión no encontrada");
  return r;
}

async function findOwnedSessionExercise(userId: number, seId: number) {
  const db = await getDb();
  const [r] = await db
    .select({
      id: s.sessionExercises.id,
      sessionId: s.sessionExercises.sessionId,
      endedAt: s.workoutSessions.endedAt,
    })
    .from(s.sessionExercises)
    .innerJoin(s.workoutSessions, eq(s.workoutSessions.id, s.sessionExercises.sessionId))
    .where(and(eq(s.sessionExercises.id, seId), eq(s.workoutSessions.userId, userId)));
  return r ?? null;
}

type SetInput = { reps: number; weightKg: number; type?: string; completed?: boolean };
function cleanSets(sets: SetInput[]) {
  return sets.slice(0, 30).map((x, i) => ({
    position: i,
    reps: clamp(Math.round(Number(x.reps) || 0), 0, 1000),
    weightKg: clamp(Math.round((Number(x.weightKg) || 0) * 100) / 100, 0, 1000),
    type: ["normal", "warmup", "dropset", "failure"].includes(x.type ?? "") ? x.type! : "normal",
    completed: Boolean(x.completed),
  }));
}

/* ───────────── Rutinas ───────────── */

const DEFAULT_ROUTINE_COLOR = "#2f55f4";

export async function createRoutine(form: FormData) {
  const user = await requireUser();
  const name = str(form.get("name")) || "Nueva rutina";
  const color = /^#[0-9a-f]{6}$/i.test(str(form.get("color"))) ? str(form.get("color")) : DEFAULT_ROUTINE_COLOR;
  const db = await getDb();
  const [r] = await db.insert(s.routines).values({ userId: user.id, name, color }).returning({ id: s.routines.id });
  updateTag(cacheTags.routines(user.id));
  updateTag(cacheTags.routineOptions(user.id));
  redirect(`/rutinas/${r.id}`);
}

export async function updateRoutine(routineId: number, data: { name?: string; color?: string; notes?: string }) {
  const user = await requireUser();
  await ownRoutine(user.id, routineId);
  const db = await getDb();
  const patch: Partial<typeof s.routines.$inferInsert> = {};
  if (data.name?.trim()) patch.name = data.name.trim().slice(0, 80);
  if (data.color && /^#[0-9a-f]{6}$/i.test(data.color)) patch.color = data.color;
  if (data.notes !== undefined) patch.notes = data.notes.slice(0, 2000);
  if (Object.keys(patch).length) await db.update(s.routines).set(patch).where(eq(s.routines.id, routineId));
  updateTag(cacheTags.routine(routineId));
  updateTag(cacheTags.routines(user.id));
  if (patch.name !== undefined || patch.color !== undefined) {
    updateTag(cacheTags.routineOptions(user.id));
    updateTag(cacheTags.calendar(user.id));
  }
  refresh();
}

export async function deleteRoutine(routineId: number) {
  const user = await requireUser();
  const db = await getDb();
  const affectedSessions = await db
    .select({ id: s.workoutSessions.id })
    .from(s.workoutSessions)
    .where(and(eq(s.workoutSessions.userId, user.id), eq(s.workoutSessions.routineId, routineId)));
  await db.delete(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.userId, user.id)));
  updateTag(cacheTags.routine(routineId));
  updateTag(cacheTags.routines(user.id));
  updateTag(cacheTags.routineOptions(user.id));
  updateTag(cacheTags.plan(user.id));
  updateTag(cacheTags.calendar(user.id));
  for (const sess of affectedSessions) updateTag(cacheTags.session(sess.id));
  redirect("/rutinas", RedirectType.replace);
}

export async function duplicateRoutine(routineId: number) {
  const user = await requireUser();
  const db = await getDb();
  const [src] = await db.select().from(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.userId, user.id)));
  if (!src) throw new Error("Rutina no encontrada");
  const [copy] = await db
    .insert(s.routines)
    .values({ userId: user.id, name: `${src.name} (copia)`, color: src.color, notes: src.notes })
    .returning({ id: s.routines.id });
  const exs = await db
    .select()
    .from(s.routineExercises)
    .where(eq(s.routineExercises.routineId, routineId))
    .orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id));
  if (exs.length) {
    const [allSets, insertedExs] = await Promise.all([
      db
        .select()
        .from(s.routineSets)
        .where(inArray(s.routineSets.routineExerciseId, exs.map((e) => e.id)))
        .orderBy(asc(s.routineSets.position), asc(s.routineSets.id)),
      db
        .insert(s.routineExercises)
        .values(exs.map((e) => ({ routineId: copy.id, exerciseId: e.exerciseId, position: e.position, restSeconds: e.restSeconds, notes: e.notes })))
        .returning({ id: s.routineExercises.id }),
    ]);
    const setsByEx = new Map<number, typeof allSets>();
    for (const x of allSets) {
      const arr = setsByEx.get(x.routineExerciseId);
      if (arr) arr.push(x);
      else setsByEx.set(x.routineExerciseId, [x]);
    }
    const setRows = exs.flatMap((e, idx) => {
      const routineExerciseId = insertedExs[idx].id;
      return (setsByEx.get(e.id) ?? []).map((x, k) => ({
        routineExerciseId,
        position: k,
        reps: x.reps,
        weightKg: x.weightKg,
        type: x.type,
      }));
    });
    if (setRows.length) await db.insert(s.routineSets).values(setRows);
  }
  updateTag(cacheTags.routines(user.id));
  updateTag(cacheTags.routineOptions(user.id));
  redirect(`/rutinas/${copy.id}`);
}

export async function addExercisesToRoutine(routineId: number, exerciseIds: string[]) {
  const user = await requireUser();
  await ownRoutine(user.id, routineId);
  const ids = exerciseIds.slice(0, 30);
  if (!ids.length) return;
  const db = await getDb();
  const [[{ m }], last] = await Promise.all([
    db.select({ m: max(s.routineExercises.position) }).from(s.routineExercises).where(eq(s.routineExercises.routineId, routineId)),
    lastSetsByExercise(user.id, ids),
  ]);
  const startPos = (m ?? -1) + 1;
  const inserted = await db
    .insert(s.routineExercises)
    .values(ids.map((exerciseId, i) => ({ routineId, exerciseId, position: startPos + i, restSeconds: user.defaultRestSeconds })))
    .returning({ id: s.routineExercises.id });
  const setRows = ids.flatMap((exerciseId, idx) => {
    const prev = last.get(exerciseId)?.sets;
    const sets = prev?.length ? prev.map((x) => ({ reps: x.reps, weightKg: x.weightKg })) : [0, 1, 2].map(() => ({ reps: 10, weightKg: 0 }));
    return sets.map((x, k) => ({ routineExerciseId: inserted[idx].id, position: k, reps: x.reps, weightKg: x.weightKg }));
  });
  if (setRows.length) await db.insert(s.routineSets).values(setRows);
  updateTag(cacheTags.routine(routineId));
  updateTag(cacheTags.routines(user.id));
  refresh();
}

export async function removeRoutineExercise(reId: number) {
  const user = await requireUser();
  const { routineId } = await ownRoutineExercise(user.id, reId);
  const db = await getDb();
  await db.delete(s.routineExercises).where(eq(s.routineExercises.id, reId));
  updateTag(cacheTags.routine(routineId));
  updateTag(cacheTags.routines(user.id));
  refresh();
}

export async function moveRoutineExercise(reId: number, dir: -1 | 1) {
  const user = await requireUser();
  const { routineId } = await ownRoutineExercise(user.id, reId);
  const db = await getDb();
  const list = await db.select().from(s.routineExercises).where(eq(s.routineExercises.routineId, routineId)).orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id));
  const i = list.findIndex((x) => x.id === reId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const updates = list.map((x, k) => ({ id: x.id, pos: k })).filter((u, k) => list[k].position !== u.pos);
  if (updates.length) {
    const cases = updates.map((u) => sql`when ${u.id}::int then ${u.pos}::int`);
    await db
      .update(s.routineExercises)
      .set({ position: sql`case ${s.routineExercises.id} ${sql.join(cases, sql` `)} end` })
      .where(inArray(s.routineExercises.id, updates.map((u) => u.id)));
  }
  updateTag(cacheTags.routine(routineId));
  refresh();
}

export async function saveRoutineSets(reId: number, sets: SetInput[], restSeconds?: number) {
  const user = await requireUser();
  const { routineId } = await ownRoutineExercise(user.id, reId);
  const db = await getDb();
  await db.delete(s.routineSets).where(eq(s.routineSets.routineExerciseId, reId));
  const rows = cleanSets(sets).map((x) => ({ position: x.position, reps: x.reps, weightKg: x.weightKg, type: x.type, routineExerciseId: reId }));
  if (rows.length) await db.insert(s.routineSets).values(rows);
  if (restSeconds !== undefined)
    await db.update(s.routineExercises).set({ restSeconds: clamp(Math.round(restSeconds), 0, 900) }).where(eq(s.routineExercises.id, reId));
  updateTag(cacheTags.routine(routineId));
  updateTag(cacheTags.routines(user.id));
}

export async function saveRoutineExerciseNotes(reId: number, notes: string) {
  const user = await requireUser();
  const { routineId } = await ownRoutineExercise(user.id, reId);
  const db = await getDb();
  const clean = notes.trim().slice(0, 500) || null;
  await db.update(s.routineExercises).set({ notes: clean }).where(eq(s.routineExercises.id, reId));
  updateTag(cacheTags.routine(routineId));
}

/* ───────────── Plan ───────────── */

export async function savePlan(form: FormData) {
  const user = await requireUser();
  const name = str(form.get("name")) || "Mi plan";
  const startDate = isValidISODate(str(form.get("startDate"))) ? str(form.get("startDate")) : todayISO();
  const cycleWeeks = clamp(Math.round(num(form.get("cycleWeeks"), 1)), 1, 8);
  const db = await getDb();
  const [plan] = await db.select().from(s.plans).where(and(eq(s.plans.userId, user.id), eq(s.plans.isActive, true))).limit(1);
  if (plan) {
    await db.update(s.plans).set({ name, startDate, cycleWeeks }).where(eq(s.plans.id, plan.id));
    await db.delete(s.planDays).where(and(eq(s.planDays.planId, plan.id), sql`${s.planDays.weekIndex} >= ${cycleWeeks}`));
  } else {
    await db.insert(s.plans).values({ userId: user.id, name, startDate, cycleWeeks });
  }
  updateTag(cacheTags.plan(user.id));
  updateTag(cacheTags.calendar(user.id));
  refresh();
}

type SlotInput = {
  kind: "workout" | "rest" | "activity";
  routineId?: number | null;
  activityType?: string | null;
  extraActivities?: string[] | null;
  label?: string | null;
};

async function validSlot(userId: number, input: SlotInput) {
  if (!["workout", "rest", "activity"].includes(input.kind)) throw new Error("Tipo de día no válido");
  const extras = Array.isArray(input.extraActivities) ? input.extraActivities.map(String) : [];
  if (extras.some((a) => a === "gym" || !ACTIVITY_TYPES[a])) throw new Error("Actividad no válida");
  const slot = normalizeSlot({
    kind: input.kind,
    routineId: input.kind === "workout" ? (input.routineId ?? null) : null,
    activityType: input.kind === "activity" ? (input.activityType ?? null) : null,
    extraActivities: extras,
    label: input.label?.trim().slice(0, 60) || null,
  });
  if (slot.kind === "workout") {
    if (!slot.routineId) throw new Error("Elige una rutina");
    await ownRoutine(userId, slot.routineId);
  }
  if (slot.kind === "activity" && !ACTIVITY_TYPES[slot.activityType ?? ""]) throw new Error("Actividad no válida");
  return slot;
}

export async function setPlanDay(weekIndex: number, weekday: number, slot: SlotInput) {
  const user = await requireUser();
  const db = await getDb();
  const [plan] = await db.select().from(s.plans).where(and(eq(s.plans.userId, user.id), eq(s.plans.isActive, true))).limit(1);
  if (!plan) throw new Error("Crea primero el plan");
  if (weekIndex < 0 || weekIndex >= plan.cycleWeeks || weekday < 1 || weekday > 7) throw new Error("Día no válido");
  const v = await validSlot(user.id, slot);
  await db
    .insert(s.planDays)
    .values({ planId: plan.id, weekIndex, weekday, ...v })
    .onConflictDoUpdate({ target: [s.planDays.planId, s.planDays.weekIndex, s.planDays.weekday], set: v });
  updateTag(cacheTags.plan(user.id));
  updateTag(cacheTags.calendar(user.id));
  refresh();
}

export async function setOverride(date: string, slot: SlotInput | null) {
  const user = await requireUser();
  if (!isValidISODate(date)) throw new Error("Fecha no válida");
  const db = await getDb();
  if (!slot) {
    await db.delete(s.calendarOverrides).where(and(eq(s.calendarOverrides.userId, user.id), eq(s.calendarOverrides.date, date)));
  } else {
    const v = await validSlot(user.id, slot);
    await db
      .insert(s.calendarOverrides)
      .values({ userId: user.id, date, ...v })
      .onConflictDoUpdate({ target: [s.calendarOverrides.userId, s.calendarOverrides.date], set: v });
  }
  updateTag(cacheTags.calendar(user.id));
  refresh();
}

/* ───────────── Sesiones ───────────── */

async function copySessionExercisesToRoutine(db: DB, sessionId: number, targetRoutineId: number, replaceExisting: boolean) {
  const sessionExs = await db
    .select()
    .from(s.sessionExercises)
    .where(eq(s.sessionExercises.sessionId, sessionId))
    .orderBy(asc(s.sessionExercises.position), asc(s.sessionExercises.id));
  const allSets = sessionExs.length
    ? await db
        .select()
        .from(s.sessionSets)
        .where(inArray(s.sessionSets.sessionExerciseId, sessionExs.map((e) => e.id)))
        .orderBy(asc(s.sessionSets.position), asc(s.sessionSets.id))
    : [];
  const setsByEx = new Map<number, typeof allSets>();
  for (const x of allSets) {
    const arr = setsByEx.get(x.sessionExerciseId);
    if (arr) arr.push(x);
    else setsByEx.set(x.sessionExerciseId, [x]);
  }
  if (replaceExisting) {
    await db.delete(s.routineExercises).where(eq(s.routineExercises.routineId, targetRoutineId));
  }
  if (!sessionExs.length) return;
  const insertedExs = await db
    .insert(s.routineExercises)
    .values(sessionExs.map((se, i) => ({ routineId: targetRoutineId, exerciseId: se.exerciseId, position: i, restSeconds: se.restSeconds, notes: se.notes })))
    .returning({ id: s.routineExercises.id });
  const setRows = sessionExs.flatMap((se, idx) => {
    const routineExerciseId = insertedExs[idx].id;
    return (setsByEx.get(se.id) ?? []).map((x, k) => ({
      routineExerciseId,
      position: k,
      reps: x.reps,
      weightKg: x.weightKg,
      type: x.type,
    }));
  });
  if (setRows.length) await db.insert(s.routineSets).values(setRows);
}

async function createRoutineCopyFromSession(db: DB, userId: number, session: { id: number; routineId: number | null }, name: string) {
  const srcRoutine = session.routineId ? (await db.select().from(s.routines).where(eq(s.routines.id, session.routineId)))[0] : null;
  const [newRoutine] = await db
    .insert(s.routines)
    .values({ userId, name: name.trim().slice(0, 100), color: srcRoutine?.color ?? DEFAULT_ROUTINE_COLOR })
    .returning({ id: s.routines.id });
  await copySessionExercisesToRoutine(db, session.id, newRoutine.id, false);
  return newRoutine.id;
}

export async function startWorkout(routineId: number | null, date?: string) {
  const user = await requireUser();
  const db = await getDb();
  const day = date && isValidISODate(date) ? date : todayISO();
  // Evita sesiones duplicadas por doble pulsación rápida.
  const recentCutoff = new Date(Date.now() - 10_000);
  const [recent] = await db
    .select({ id: s.workoutSessions.id })
    .from(s.workoutSessions)
    .where(
      and(
        eq(s.workoutSessions.userId, user.id),
        eq(s.workoutSessions.date, day),
        isNull(s.workoutSessions.endedAt),
        gte(s.workoutSessions.startedAt, recentCutoff),
        routineId === null ? isNull(s.workoutSessions.routineId) : eq(s.workoutSessions.routineId, routineId),
      ),
    )
    .orderBy(desc(s.workoutSessions.startedAt))
    .limit(1);
  if (recent) redirect(`/sesion/${recent.id}`);

  let name = "Entrenamiento libre";
  let template: { exerciseId: string; restSeconds: number; notes: string | null; sets: { reps: number; weightKg: number; type: string }[] }[] = [];
  let last = new Map<string, { date: string; sets: { reps: number; weightKg: number; completed: boolean }[] }>();
  if (routineId) {
    const [r] = await db.select().from(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.userId, user.id)));
    if (!r) throw new Error("Rutina no encontrada");
    name = r.name;
    const exs = await db
      .select()
      .from(s.routineExercises)
      .where(eq(s.routineExercises.routineId, routineId))
      .orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id));
    if (exs.length) {
      const [sets, lastMap] = await Promise.all([
        db.select().from(s.routineSets).where(inArray(s.routineSets.routineExerciseId, exs.map((e) => e.id))).orderBy(asc(s.routineSets.position)),
        lastSetsByExercise(user.id, exs.map((e) => e.exerciseId)),
      ]);
      last = lastMap;
      const setsByEx = new Map<number, typeof sets>();
      for (const x of sets) {
        const arr = setsByEx.get(x.routineExerciseId);
        if (arr) arr.push(x);
        else setsByEx.set(x.routineExerciseId, [x]);
      }
      template = exs.map((e) => ({
        exerciseId: e.exerciseId,
        restSeconds: e.restSeconds,
        notes: e.notes,
        sets: setsByEx.get(e.id) ?? [],
      }));
    }
  }
  const [session] = await db.insert(s.workoutSessions).values({ userId: user.id, routineId, name, date: day }).returning({ id: s.workoutSessions.id });
  if (template.length) {
    const insertedExs = await db
      .insert(s.sessionExercises)
      .values(template.map((t, i) => ({ sessionId: session.id, exerciseId: t.exerciseId, position: i, restSeconds: t.restSeconds, notes: t.notes })))
      .returning({ id: s.sessionExercises.id });
    // Prellenado: mismo nº de series que la plantilla; pesos/reps de la última vez si existen.
    const setRows = template.flatMap((t, idx) => {
      const prev = last.get(t.exerciseId)?.sets ?? [];
      const sessionExerciseId = insertedExs[idx].id;
      return t.sets.map((x, k) => {
        const p = prev[k] ?? prev[prev.length - 1];
        return { sessionExerciseId, position: k, reps: p?.reps ?? x.reps, weightKg: p?.weightKg ?? x.weightKg, type: x.type };
      });
    });
    if (setRows.length) await db.insert(s.sessionSets).values(setRows);
  }
  updateTag(cacheTags.openSession(user.id));
  updateTag(cacheTags.calendar(user.id));
  redirect(`/sesion/${session.id}`);
}

export async function addExercisesToSession(sessionId: number, exerciseIds: string[]) {
  const user = await requireUser();
  const session = await ownSession(user.id, sessionId);
  const ids = exerciseIds.slice(0, 30);
  if (!ids.length) return;
  const db = await getDb();
  const [[{ m }], last] = await Promise.all([
    db.select({ m: max(s.sessionExercises.position) }).from(s.sessionExercises).where(eq(s.sessionExercises.sessionId, sessionId)),
    lastSetsByExercise(user.id, ids, sessionId),
  ]);
  const startPos = (m ?? -1) + 1;
  const inserted = await db
    .insert(s.sessionExercises)
    .values(ids.map((exerciseId, i) => ({ sessionId, exerciseId, position: startPos + i, restSeconds: user.defaultRestSeconds })))
    .returning({ id: s.sessionExercises.id });
  const setRows = ids.flatMap((exerciseId, idx) => {
    const prev = last.get(exerciseId)?.sets;
    const sets = prev?.length ? prev : [0, 1, 2].map(() => ({ reps: 10, weightKg: 0 }));
    return sets.map((x, k) => ({ sessionExerciseId: inserted[idx].id, position: k, reps: x.reps, weightKg: x.weightKg }));
  });
  if (setRows.length) await db.insert(s.sessionSets).values(setRows);
  updateTag(cacheTags.session(sessionId));
  if (session.endedAt !== null) updateTag(cacheTags.analytics(user.id));
  refresh();
}

export async function removeSessionExercise(seId: number) {
  const user = await requireUser();
  const owned = await findOwnedSessionExercise(user.id, seId);
  if (owned) {
    const db = await getDb();
    await db.delete(s.sessionExercises).where(eq(s.sessionExercises.id, seId));
    updateTag(cacheTags.session(owned.sessionId));
    if (owned.endedAt !== null) updateTag(cacheTags.analytics(user.id));
  }
  refresh();
}

export async function saveSessionSets(seId: number, sets: SetInput[]): Promise<{ ok: true } | { ok: false; missing: true }> {
  const user = await requireUser();
  const owned = await findOwnedSessionExercise(user.id, seId);
  if (!owned) return { ok: false, missing: true };
  const db = await getDb();
  await db.delete(s.sessionSets).where(eq(s.sessionSets.sessionExerciseId, seId));
  const rows = cleanSets(sets).map((x) => ({ ...x, sessionExerciseId: seId }));
  if (rows.length) await db.insert(s.sessionSets).values(rows);
  updateTag(cacheTags.session(owned.sessionId));
  if (owned.endedAt !== null) updateTag(cacheTags.analytics(user.id));
  return { ok: true };
}

export async function saveSessionExerciseNotes(seId: number, notes: string): Promise<{ ok: true } | { ok: false; missing: true }> {
  const user = await requireUser();
  const owned = await findOwnedSessionExercise(user.id, seId);
  if (!owned) return { ok: false, missing: true };
  const db = await getDb();
  const clean = notes.trim().slice(0, 500) || null;
  await db.update(s.sessionExercises).set({ notes: clean }).where(eq(s.sessionExercises.id, seId));
  updateTag(cacheTags.session(owned.sessionId));
  return { ok: true };
}

export async function finishWorkout(
  sessionId: number,
  opts: {
    durationMin: number;
    intensity: Intensity;
    notes?: string;
    updateRoutine?: boolean;
    routineAction?: "update" | "new";
    newRoutineName?: string;
    cardio?: { type: string; durationMin: number; intensity: Intensity; notes?: string };
  },
): Promise<{ ok: true } | { ok: false; missing: true }> {
  const user = await requireUser();
  const db = await getDb();
  const [session] = await db
    .select()
    .from(s.workoutSessions)
    .where(and(eq(s.workoutSessions.id, sessionId), eq(s.workoutSessions.userId, user.id)));
  if (!session) return { ok: false, missing: true };
  const wasFinished = session.endedAt !== null;
  const durationMin = clamp(Math.round(opts.durationMin) || 0, 1, 600);
  const intensity: Intensity = isIntensity(opts.intensity) ? opts.intensity : "moderate";
  const kcal = estimateKcal(metFor("gym", intensity), user.bodyWeightKg, durationMin);
  await db
    .update(s.workoutSessions)
    .set({ endedAt: session.endedAt ?? new Date(), durationMin, intensity, kcal, notes: opts.notes?.slice(0, 2000) || null })
    .where(eq(s.workoutSessions.id, sessionId));

  let addedCardio = false;
  if (!wasFinished && opts.cardio && ACTIVITY_TYPES[opts.cardio.type] && opts.cardio.type !== "gym") {
    const cardioDuration = clamp(Math.round(opts.cardio.durationMin) || 0, 1, 600);
    const cardioIntensity: Intensity = isIntensity(opts.cardio.intensity) ? opts.cardio.intensity : "moderate";
    const cardioKcal = estimateKcal(metFor(opts.cardio.type, cardioIntensity), user.bodyWeightKg, cardioDuration);
    await db.insert(s.activities).values({
      userId: user.id,
      type: opts.cardio.type,
      date: session.date,
      durationMin: cardioDuration,
      intensity: cardioIntensity,
      kcal: cardioKcal,
      notes: opts.cardio.notes?.trim().slice(0, 500) || null,
    });
    addedCardio = true;
  }

  let updatedRoutineId: number | null = null;
  let createdRoutine = false;
  if (opts.routineAction === "update" && session.routineId) {
    // Reemplaza la rutina entera (ejercicios + sets) con lo de esta sesión.
    await copySessionExercisesToRoutine(db, sessionId, session.routineId, true);
    updatedRoutineId = session.routineId;
  } else if (opts.routineAction === "new" && opts.newRoutineName?.trim()) {
    // Crea una rutina nueva a partir de los ejercicios de esta sesión.
    await createRoutineCopyFromSession(db, user.id, session, opts.newRoutineName);
    createdRoutine = true;
  } else if (opts.updateRoutine && session.routineId) {
    // Comportamiento previo: solo actualiza pesos/reps de los ejercicios que ya estaban en la rutina.
    const [detail, res] = await Promise.all([
      db.select().from(s.sessionExercises).where(eq(s.sessionExercises.sessionId, sessionId)),
      db.select().from(s.routineExercises).where(eq(s.routineExercises.routineId, session.routineId)),
    ]);
    const allSets = detail.length
      ? await db
          .select()
          .from(s.sessionSets)
          .where(inArray(s.sessionSets.sessionExerciseId, detail.map((d) => d.id)))
          .orderBy(asc(s.sessionSets.position))
      : [];
    const setsByEx = new Map<number, typeof allSets>();
    for (const x of allSets) {
      const arr = setsByEx.get(x.sessionExerciseId);
      if (arr) arr.push(x);
      else setsByEx.set(x.sessionExerciseId, [x]);
    }
    const routineByEx = new Map(res.map((r) => [r.exerciseId, r]));
    const targetSetsByReId = new Map<number, typeof allSets>();
    const notesUpdates: { id: number; notes: string | null }[] = [];
    for (const se of detail) {
      const re = routineByEx.get(se.exerciseId);
      if (!re) continue;
      targetSetsByReId.set(re.id, setsByEx.get(se.id) ?? []);
      if (se.notes !== re.notes) {
        notesUpdates.push({ id: re.id, notes: se.notes });
      }
    }
    const targetReIds = [...targetSetsByReId.keys()];
    if (targetReIds.length) {
      await db.delete(s.routineSets).where(inArray(s.routineSets.routineExerciseId, targetReIds));
      const newSets = [...targetSetsByReId.entries()].flatMap(([routineExerciseId, sets]) =>
        sets.map((x, i) => ({ routineExerciseId, position: i, reps: x.reps, weightKg: x.weightKg, type: x.type })),
      );
      if (newSets.length) await db.insert(s.routineSets).values(newSets);
      for (const u of notesUpdates) {
        await db.update(s.routineExercises).set({ notes: u.notes }).where(eq(s.routineExercises.id, u.id));
      }
      updatedRoutineId = session.routineId;
    }
  }
  updateTag(cacheTags.session(sessionId));
  updateTag(cacheTags.openSession(user.id));
  updateTag(cacheTags.calendar(user.id));
  updateTag(cacheTags.analytics(user.id));
  updateTag(cacheTags.energy(user.id));
  if (addedCardio) updateTag(cacheTags.activities(user.id));
  if (updatedRoutineId !== null) {
    updateTag(cacheTags.routine(updatedRoutineId));
    updateTag(cacheTags.routines(user.id));
  }
  if (createdRoutine) {
    updateTag(cacheTags.routines(user.id));
    updateTag(cacheTags.routineOptions(user.id));
  }
  refresh();
  return { ok: true };
}

export async function updateRoutineFromSession(sessionId: number): Promise<void> {
  const user = await requireUser();
  const session = await ownSession(user.id, sessionId);
  if (!session.routineId) throw new Error("La sesión no tiene rutina asociada");
  const db = await getDb();
  await copySessionExercisesToRoutine(db, sessionId, session.routineId, true);
  updateTag(cacheTags.routine(session.routineId));
  updateTag(cacheTags.routines(user.id));
  refresh();
}

export async function createRoutineFromSession(sessionId: number, name: string): Promise<void> {
  const user = await requireUser();
  const session = await ownSession(user.id, sessionId);
  if (!name.trim()) throw new Error("Pon un nombre a la rutina");
  const db = await getDb();
  await createRoutineCopyFromSession(db, user.id, session, name);
  updateTag(cacheTags.routines(user.id));
  updateTag(cacheTags.routineOptions(user.id));
  refresh();
}

export async function deleteWorkout(sessionId: number, opts?: { redirectToHome?: boolean }) {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(s.workoutSessions).where(and(eq(s.workoutSessions.id, sessionId), eq(s.workoutSessions.userId, user.id)));
  updateTag(cacheTags.session(sessionId));
  updateTag(cacheTags.openSession(user.id));
  updateTag(cacheTags.calendar(user.id));
  updateTag(cacheTags.analytics(user.id));
  updateTag(cacheTags.energy(user.id));
  if (opts?.redirectToHome === false) {
    refresh();
    return;
  }
  redirect("/", RedirectType.replace);
}

/* ───────────── Actividades ───────────── */

export async function logActivity(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const type = str(form.get("type"));
  const date = str(form.get("date"));
  const intensity = str(form.get("intensity"));
  const measure = str(form.get("measure")) || "minutes";
  const userNotes = str(form.get("notes"));
  if (!ACTIVITY_TYPES[type]) return { error: "Elige una actividad" };
  if (!isValidISODate(date)) return { error: "Fecha no válida" };
  if (!isIntensity(intensity)) return { error: "Intensidad no válida" };

  let durationMin: number;
  let kcal: number;
  let autoNote = "";

  if (type === "walking" && measure === "km") {
    const distanceKm = num(form.get("distanceKm"));
    if (distanceKm <= 0 || distanceKm > 200) return { error: "Distancia entre 0,1 y 200 km" };
    durationMin = clamp(walkingDurationMin(distanceKm, intensity), 1, 1440);
    kcal = estimateWalkingKcalFromKm(distanceKm, user.bodyWeightKg, intensity);
    autoNote = `${Number(distanceKm.toFixed(2))} km`;
  } else if (type === "walking" && measure === "steps") {
    const steps = Math.round(num(form.get("steps")));
    if (steps < 1 || steps > 200000) return { error: "Pasos entre 1 y 200.000" };
    const distanceKm = stepsToKm(steps, user.heightCm);
    durationMin = clamp(walkingDurationMin(distanceKm, intensity), 1, 1440);
    kcal = estimateWalkingKcalFromKm(distanceKm, user.bodyWeightKg, intensity);
    autoNote = `${steps.toLocaleString("es-ES")} pasos (~${distanceKm.toFixed(1)} km)`;
  } else {
    durationMin = Math.round(num(form.get("durationMin")));
    if (durationMin < 1 || durationMin > 600) return { error: "Duración entre 1 y 600 minutos" };
    kcal = estimateKcal(metFor(type, intensity), user.bodyWeightKg, durationMin);
  }

  const combinedNotes = [autoNote, userNotes].filter(Boolean).join(" · ").slice(0, 500) || null;
  const db = await getDb();
  await db.insert(s.activities).values({ userId: user.id, type, date, durationMin, intensity, kcal, notes: combinedNotes });
  updateTag(cacheTags.activities(user.id));
  updateTag(cacheTags.calendar(user.id));
  updateTag(cacheTags.energy(user.id));
  refresh();
  return { ok: true };
}

export async function deleteActivity(id: number) {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(s.activities).where(and(eq(s.activities.id, id), eq(s.activities.userId, user.id)));
  updateTag(cacheTags.activities(user.id));
  updateTag(cacheTags.calendar(user.id));
  updateTag(cacheTags.energy(user.id));
  refresh();
}

/* ───────────── kcal consumidas ───────────── */

/** Guarda las kcal consumidas un día. Vacío o 0 borra el registro. */
export async function logIntake(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const date = str(form.get("date"));
  const raw = str(form.get("kcal"));
  if (!isValidISODate(date)) return { error: "Fecha no válida" };
  const kcal = raw ? Math.round(num(raw, NaN)) : 0;
  if (!Number.isFinite(kcal) || kcal < 0 || kcal > 15000) return { error: "kcal entre 0 y 15000" };
  const db = await getDb();
  const where = and(eq(s.intakeLogs.userId, user.id), eq(s.intakeLogs.date, date));
  if (kcal === 0) await db.delete(s.intakeLogs).where(where);
  else
    await db
      .insert(s.intakeLogs)
      .values({ userId: user.id, date, kcal })
      .onConflictDoUpdate({ target: [s.intakeLogs.userId, s.intakeLogs.date], set: { kcal } });
  updateTag(cacheTags.energy(user.id));
  refresh();
  return { ok: true };
}

/* ───────────── Ejercicios propios ───────────── */

export async function createCustomExercise(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(form.get("name"));
  const primaryMuscle = str(form.get("muscle"));
  const equipment = str(form.get("equipment")) || "other";
  const image = str(form.get("image"));
  if (name.length < 2) return { error: "Pon un nombre" };
  if (!primaryMuscle) return { error: "Elige el músculo" };
  if (image && !/^https:\/\/\S+$/.test(image)) return { error: "La imagen debe ser una URL https" };
  const db = await getDb();
  const id = `u${user.id}_${name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").slice(0, 40)}_${Date.now().toString(36)}`;
  await db.insert(s.exercises).values({ id, name, primaryMuscle, equipment, ownerId: user.id, images: image ? [image] : [] });
  updateTag(cacheTags.exercises(user.id));
  updateTag(cacheTags.exercise(id));
  redirect(`/ejercicios/${encodeURIComponent(id)}`);
}

/* ───────────── Acceso para IAs ───────────── */

/** Crea un token personal. El valor en claro solo se devuelve aquí, una vez. */
export async function createApiToken(_: unknown, form: FormData): Promise<{ error?: string; token?: string }> {
  const user = await requireUser();
  const name = str(form.get("name")).slice(0, 60);
  const scope = str(form.get("scope")) === "read" ? "read" : "edit";
  if (!name) return { error: "Ponle un nombre (p. ej. Instinct)" };
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.apiTokens).where(eq(s.apiTokens.userId, user.id));
  if (n >= 10) return { error: "Máximo 10 tokens. Revoca alguno." };
  const { token, hash } = generateToken();
  await db.insert(s.apiTokens).values({ userId: user.id, name, scope, tokenHash: hash });
  updateTag(cacheTags.tokens(user.id));
  refresh();
  return { token };
}

export async function revokeApiToken(id: number) {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(s.apiTokens).where(and(eq(s.apiTokens.id, id), eq(s.apiTokens.userId, user.id)));
  updateTag(cacheTags.tokens(user.id));
  refresh();
}

/* ───────────── Recordatorios (Web Push) ───────────── */

export async function updateReminderSettings(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const reminderEnabled = form.get("reminderEnabled") === "on";
  const reminderHour = clamp(Math.round(num(form.get("reminderHour"), user.reminderHour)), 0, 23);
  const rawTz = str(form.get("reminderTimeZone"));
  const reminderTimeZone = isValidTimeZone(rawTz) ? rawTz : user.reminderTimeZone;

  const db = await getDb();
  await db
    .update(s.users)
    .set({ reminderEnabled, reminderHour, reminderTimeZone })
    .where(eq(s.users.id, user.id));
  updateTag(cacheTags.userProfile(user.id));
  refresh();
  return { ok: true };
}
