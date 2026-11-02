"use server";

import bcrypt from "bcryptjs";
import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { endSession, requireUser, startSession } from "@/lib/auth";
import { isValidISODate, todayISO } from "@/lib/dates";
import { ACTIVITY_TYPES, estimateKcal, isIntensity, metFor, type Intensity } from "@/lib/kcal";
import { lastSetsByExercise } from "@/lib/data";

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
  const db = await getDb();
  await db.update(s.users).set({ name, bodyWeightKg }).where(eq(s.users.id, user.id));
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

async function ownSessionExercise(userId: number, seId: number) {
  const db = await getDb();
  const [r] = await db
    .select({ id: s.sessionExercises.id, sessionId: s.sessionExercises.sessionId })
    .from(s.sessionExercises)
    .innerJoin(s.workoutSessions, eq(s.workoutSessions.id, s.sessionExercises.sessionId))
    .where(and(eq(s.sessionExercises.id, seId), eq(s.workoutSessions.userId, userId)));
  if (!r) throw new Error("Ejercicio no encontrado");
  return r;
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

export async function createRoutine(form: FormData) {
  const user = await requireUser();
  const name = str(form.get("name")) || "Nueva rutina";
  const color = /^#[0-9a-f]{6}$/i.test(str(form.get("color"))) ? str(form.get("color")) : "#f97316";
  const db = await getDb();
  const [r] = await db.insert(s.routines).values({ userId: user.id, name, color }).returning({ id: s.routines.id });
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
  refresh();
}

export async function deleteRoutine(routineId: number) {
  const user = await requireUser();
  await ownRoutine(user.id, routineId);
  const db = await getDb();
  await db.delete(s.routines).where(eq(s.routines.id, routineId));
  redirect("/rutinas");
}

export async function duplicateRoutine(routineId: number) {
  const user = await requireUser();
  await ownRoutine(user.id, routineId);
  const db = await getDb();
  const [src] = await db.select().from(s.routines).where(eq(s.routines.id, routineId));
  const [copy] = await db
    .insert(s.routines)
    .values({ userId: user.id, name: `${src.name} (copia)`, color: src.color, notes: src.notes })
    .returning({ id: s.routines.id });
  const exs = await db.select().from(s.routineExercises).where(eq(s.routineExercises.routineId, routineId)).orderBy(asc(s.routineExercises.position));
  for (const e of exs) {
    const [ne] = await db
      .insert(s.routineExercises)
      .values({ routineId: copy.id, exerciseId: e.exerciseId, position: e.position, restSeconds: e.restSeconds, notes: e.notes })
      .returning({ id: s.routineExercises.id });
    const sets = await db.select().from(s.routineSets).where(eq(s.routineSets.routineExerciseId, e.id));
    if (sets.length)
      await db.insert(s.routineSets).values(sets.map((x) => ({ routineExerciseId: ne.id, position: x.position, reps: x.reps, weightKg: x.weightKg, type: x.type })));
  }
  redirect(`/rutinas/${copy.id}`);
}

export async function addExercisesToRoutine(routineId: number, exerciseIds: string[]) {
  const user = await requireUser();
  await ownRoutine(user.id, routineId);
  const db = await getDb();
  const [{ m }] = await db.select({ m: max(s.routineExercises.position) }).from(s.routineExercises).where(eq(s.routineExercises.routineId, routineId));
  let pos = (m ?? -1) + 1;
  const last = await lastSetsByExercise(user.id, exerciseIds);
  for (const exerciseId of exerciseIds.slice(0, 30)) {
    const [re] = await db.insert(s.routineExercises).values({ routineId, exerciseId, position: pos++ }).returning({ id: s.routineExercises.id });
    const prev = last.get(exerciseId)?.sets;
    const sets = prev?.length ? prev.map((x) => ({ reps: x.reps, weightKg: x.weightKg })) : [0, 1, 2].map(() => ({ reps: 10, weightKg: 0 }));
    await db.insert(s.routineSets).values(sets.map((x, i) => ({ routineExerciseId: re.id, position: i, reps: x.reps, weightKg: x.weightKg })));
  }
  refresh();
}

export async function removeRoutineExercise(reId: number) {
  const user = await requireUser();
  await ownRoutineExercise(user.id, reId);
  const db = await getDb();
  await db.delete(s.routineExercises).where(eq(s.routineExercises.id, reId));
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
  for (let k = 0; k < list.length; k++) await db.update(s.routineExercises).set({ position: k }).where(eq(s.routineExercises.id, list[k].id));
  refresh();
}

export async function saveRoutineSets(reId: number, sets: SetInput[], restSeconds?: number) {
  const user = await requireUser();
  await ownRoutineExercise(user.id, reId);
  const db = await getDb();
  await db.delete(s.routineSets).where(eq(s.routineSets.routineExerciseId, reId));
  const rows = cleanSets(sets).map((x) => ({ position: x.position, reps: x.reps, weightKg: x.weightKg, type: x.type, routineExerciseId: reId }));
  if (rows.length) await db.insert(s.routineSets).values(rows);
  if (restSeconds !== undefined)
    await db.update(s.routineExercises).set({ restSeconds: clamp(Math.round(restSeconds), 0, 900) }).where(eq(s.routineExercises.id, reId));
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
  refresh();
}

type SlotInput = { kind: "workout" | "rest" | "activity"; routineId?: number | null; activityType?: string | null; label?: string | null };

async function validSlot(userId: number, slot: SlotInput) {
  if (!["workout", "rest", "activity"].includes(slot.kind)) throw new Error("Tipo de día no válido");
  if (slot.kind === "workout") {
    if (!slot.routineId) throw new Error("Elige una rutina");
    await ownRoutine(userId, slot.routineId);
  }
  if (slot.kind === "activity" && !ACTIVITY_TYPES[slot.activityType ?? ""]) throw new Error("Actividad no válida");
  return {
    kind: slot.kind,
    routineId: slot.kind === "workout" ? slot.routineId! : null,
    activityType: slot.kind === "activity" ? slot.activityType! : null,
    label: slot.label?.trim().slice(0, 60) || null,
  };
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
  refresh();
}

/* ───────────── Sesiones ───────────── */

export async function startWorkout(routineId: number | null, date?: string) {
  const user = await requireUser();
  const db = await getDb();
  const day = date && isValidISODate(date) ? date : todayISO();
  let name = "Entrenamiento libre";
  let template: { exerciseId: string; restSeconds: number; sets: { reps: number; weightKg: number; type: string }[] }[] = [];
  if (routineId) {
    const [r] = await db.select().from(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.userId, user.id)));
    if (!r) throw new Error("Rutina no encontrada");
    name = r.name;
    const exs = await db.select().from(s.routineExercises).where(eq(s.routineExercises.routineId, routineId)).orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id));
    const sets = exs.length
      ? await db.select().from(s.routineSets).where(inArray(s.routineSets.routineExerciseId, exs.map((e) => e.id))).orderBy(asc(s.routineSets.position))
      : [];
    template = exs.map((e) => ({
      exerciseId: e.exerciseId,
      restSeconds: e.restSeconds,
      sets: sets.filter((x) => x.routineExerciseId === e.id),
    }));
  }
  const last = await lastSetsByExercise(user.id, template.map((t) => t.exerciseId));
  const [session] = await db.insert(s.workoutSessions).values({ userId: user.id, routineId, name, date: day }).returning({ id: s.workoutSessions.id });
  for (let i = 0; i < template.length; i++) {
    const t = template[i];
    const [se] = await db
      .insert(s.sessionExercises)
      .values({ sessionId: session.id, exerciseId: t.exerciseId, position: i, restSeconds: t.restSeconds })
      .returning({ id: s.sessionExercises.id });
    // Prellenado: mismo nº de series que la plantilla; pesos/reps de la última vez si existen.
    const prev = last.get(t.exerciseId)?.sets ?? [];
    const rows = t.sets.map((x, k) => {
      const p = prev[k] ?? prev[prev.length - 1];
      return { sessionExerciseId: se.id, position: k, reps: p?.reps ?? x.reps, weightKg: p?.weightKg ?? x.weightKg, type: x.type };
    });
    if (rows.length) await db.insert(s.sessionSets).values(rows);
  }
  redirect(`/sesion/${session.id}`);
}

export async function addExercisesToSession(sessionId: number, exerciseIds: string[]) {
  const user = await requireUser();
  await ownSession(user.id, sessionId);
  const db = await getDb();
  const [{ m }] = await db.select({ m: max(s.sessionExercises.position) }).from(s.sessionExercises).where(eq(s.sessionExercises.sessionId, sessionId));
  let pos = (m ?? -1) + 1;
  const last = await lastSetsByExercise(user.id, exerciseIds, sessionId);
  for (const exerciseId of exerciseIds.slice(0, 30)) {
    const [se] = await db.insert(s.sessionExercises).values({ sessionId, exerciseId, position: pos++ }).returning({ id: s.sessionExercises.id });
    const prev = last.get(exerciseId)?.sets;
    const sets = prev?.length ? prev : [0, 1, 2].map(() => ({ reps: 10, weightKg: 0 }));
    await db.insert(s.sessionSets).values(sets.map((x, i) => ({ sessionExerciseId: se.id, position: i, reps: x.reps, weightKg: x.weightKg })));
  }
  refresh();
}

export async function removeSessionExercise(seId: number) {
  const user = await requireUser();
  await ownSessionExercise(user.id, seId);
  const db = await getDb();
  await db.delete(s.sessionExercises).where(eq(s.sessionExercises.id, seId));
  refresh();
}

export async function saveSessionSets(seId: number, sets: SetInput[]) {
  const user = await requireUser();
  await ownSessionExercise(user.id, seId);
  const db = await getDb();
  await db.delete(s.sessionSets).where(eq(s.sessionSets.sessionExerciseId, seId));
  const rows = cleanSets(sets).map((x) => ({ ...x, sessionExerciseId: seId }));
  if (rows.length) await db.insert(s.sessionSets).values(rows);
}

export async function finishWorkout(sessionId: number, opts: { durationMin: number; intensity: Intensity; notes?: string; updateRoutine?: boolean }) {
  const user = await requireUser();
  const session = await ownSession(user.id, sessionId);
  const durationMin = clamp(Math.round(opts.durationMin) || 0, 1, 600);
  const intensity: Intensity = isIntensity(opts.intensity) ? opts.intensity : "moderate";
  const kcal = estimateKcal(metFor("gym", intensity), user.bodyWeightKg, durationMin);
  const db = await getDb();
  await db
    .update(s.workoutSessions)
    .set({ endedAt: new Date(), durationMin, intensity, kcal, notes: opts.notes?.slice(0, 2000) || null })
    .where(eq(s.workoutSessions.id, sessionId));

  // Opcional: guardar los pesos/reps de hoy como nueva plantilla de la rutina.
  if (opts.updateRoutine && session.routineId) {
    const detail = await db.select().from(s.sessionExercises).where(eq(s.sessionExercises.sessionId, sessionId));
    const res = await db.select().from(s.routineExercises).where(eq(s.routineExercises.routineId, session.routineId));
    for (const se of detail) {
      const re = res.find((r) => r.exerciseId === se.exerciseId);
      if (!re) continue;
      const sets = await db.select().from(s.sessionSets).where(eq(s.sessionSets.sessionExerciseId, se.id)).orderBy(asc(s.sessionSets.position));
      await db.delete(s.routineSets).where(eq(s.routineSets.routineExerciseId, re.id));
      if (sets.length)
        await db.insert(s.routineSets).values(sets.map((x, i) => ({ routineExerciseId: re.id, position: i, reps: x.reps, weightKg: x.weightKg, type: x.type })));
    }
  }
  redirect(`/sesion/${sessionId}`);
}

export async function deleteWorkout(sessionId: number) {
  const user = await requireUser();
  await ownSession(user.id, sessionId);
  const db = await getDb();
  await db.delete(s.workoutSessions).where(eq(s.workoutSessions.id, sessionId));
  redirect("/");
}

/* ───────────── Actividades ───────────── */

export async function logActivity(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const type = str(form.get("type"));
  const date = str(form.get("date"));
  const durationMin = Math.round(num(form.get("durationMin")));
  const intensity = str(form.get("intensity"));
  if (!ACTIVITY_TYPES[type] || type === "gym") return { error: "Elige una actividad" };
  if (!isValidISODate(date)) return { error: "Fecha no válida" };
  if (durationMin < 1 || durationMin > 600) return { error: "Duración entre 1 y 600 minutos" };
  if (!isIntensity(intensity)) return { error: "Intensidad no válida" };
  const kcal = estimateKcal(metFor(type, intensity), user.bodyWeightKg, durationMin);
  const db = await getDb();
  await db.insert(s.activities).values({ userId: user.id, type, date, durationMin, intensity, kcal, notes: str(form.get("notes")).slice(0, 500) || null });
  refresh();
  return { ok: true };
}

export async function deleteActivity(id: number) {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(s.activities).where(and(eq(s.activities.id, id), eq(s.activities.userId, user.id)));
  refresh();
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
  redirect(`/ejercicios/${encodeURIComponent(id)}`);
}
