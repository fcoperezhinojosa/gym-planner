import "server-only";
import { revalidateTag } from "next/cache";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { completedSetsInRange, getActivePlan, getCalendar, getExercise, getRoutine, listRoutines, userCacheTag } from "./data";
import { addDays, diffDays, isValidISODate, startOfWeek, todayISO } from "./dates";
import { sql } from "drizzle-orm";
import { ACTIVITY_TYPES, activityLabel } from "./kcal";
import { EQUIPMENT, MUSCLES, MUSCLE_GROUPS, muscleGroup, muscleLabel, equipmentLabel, type MuscleGroup } from "./labels";
import { normalize } from "./text";
import { weekLetter } from "./schedule";
import { epley1RM } from "./stats";
import { summarizeDays } from "./week";

/** Error con código HTTP, para devolver mensajes claros a la IA. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/* ───────────── Ejercicios ───────────── */

export async function searchExercises(userId: number, p: { q?: string; muscle?: string; equipment?: string; limit?: number }) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(s.exercises)
    .where(or(isNull(s.exercises.ownerId), eq(s.exercises.ownerId, userId)))
    .orderBy(asc(s.exercises.name));
  const q = p.q ? normalize(p.q) : "";
  const words = q.split(/\s+/).filter(Boolean);
  const limit = clamp(Math.round(p.limit ?? 30), 1, 100);
  const out = rows
    .filter((e) => !p.muscle || e.primaryMuscle === p.muscle || e.secondaryMuscles.includes(p.muscle))
    .filter((e) => !p.equipment || e.equipment === p.equipment)
    .filter((e) => {
      if (!words.length) return true;
      const hay = normalize(`${e.nameEs ?? ""} ${e.name}`);
      return words.every((w) => hay.includes(w));
    });
  return {
    total: out.length,
    exercises: out.slice(0, limit).map((e) => ({
      id: e.id,
      name: e.nameEs ?? e.name,
      nameEn: e.name,
      primaryMuscle: e.primaryMuscle,
      muscle: muscleLabel(e.primaryMuscle),
      equipment: e.equipment,
      equipmentLabel: equipmentLabel(e.equipment),
      custom: e.ownerId !== null,
    })),
  };
}

export async function createExercise(userId: number, input: unknown) {
  if (!isObj(input)) throw new ApiError(400, "Cuerpo JSON no válido");
  const name = String(input.name ?? "").trim();
  const primaryMuscle = String(input.primaryMuscle ?? "").trim();
  const equipment = String(input.equipment ?? "other").trim() || "other";
  const image = input.image ? String(input.image).trim() : "";
  const instructions = Array.isArray(input.instructions) ? input.instructions.map((x) => String(x).slice(0, 500)).slice(0, 30) : [];
  if (name.length < 2 || name.length > 100) throw new ApiError(400, "name debe tener entre 2 y 100 caracteres");
  if (!MUSCLES[primaryMuscle]) throw new ApiError(400, `primaryMuscle no válido. Valores: ${Object.keys(MUSCLES).join(", ")}`);
  if (!EQUIPMENT[equipment]) throw new ApiError(400, `equipment no válido. Valores: ${Object.keys(EQUIPMENT).join(", ")}`);
  if (image && !/^https:\/\/\S+$/.test(image)) throw new ApiError(400, "image debe ser una URL https");
  const db = await getDb();
  // Evita duplicados exactos de nombre entre los ejercicios visibles.
  const existing = await db
    .select({ id: s.exercises.id, name: s.exercises.name, nameEs: s.exercises.nameEs })
    .from(s.exercises)
    .where(or(isNull(s.exercises.ownerId), eq(s.exercises.ownerId, userId)));
  const dup = existing.find((e) => normalize(e.nameEs ?? e.name) === normalize(name) || normalize(e.name) === normalize(name));
  if (dup) throw new ApiError(409, `Ya existe un ejercicio con ese nombre (id: ${dup.id}). Úsalo en lugar de crear otro.`);
  const id = `u${userId}_${name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").slice(0, 40)}_${Date.now().toString(36)}`;
  await db.insert(s.exercises).values({ id, name, primaryMuscle, equipment, ownerId: userId, images: image ? [image] : [], instructions });
  revalidateTag(userCacheTag(userId), { expire: 0 });
  return { id, name, primaryMuscle, equipment };
}

/* ───────────── Rutinas ───────────── */

type SetIn = { reps: number; weightKg: number; type: string };
type ExerciseIn = { exerciseId: string; restSeconds: number; notes: string | null; sets: SetIn[] };

function parseSets(raw: Record<string, unknown>): SetIn[] {
  const type = (t: unknown) => (["normal", "warmup", "dropset", "failure"].includes(String(t)) ? String(t) : "normal");
  if (Array.isArray(raw.sets)) {
    return raw.sets.slice(0, 30).map((x) => {
      const o = isObj(x) ? x : {};
      return { reps: clamp(Math.round(Number(o.reps) || 10), 1, 1000), weightKg: clamp(Math.round((Number(o.weightKg) || 0) * 100) / 100, 0, 1000), type: type(o.type) };
    });
  }
  const n = clamp(Math.round(Number(raw.setsCount) || 3), 1, 30);
  const reps = clamp(Math.round(Number(raw.reps) || 10), 1, 1000);
  const weightKg = clamp(Math.round((Number(raw.weightKg) || 0) * 100) / 100, 0, 1000);
  return Array.from({ length: n }, () => ({ reps, weightKg, type: "normal" }));
}

async function parseExercises(userId: number, raw: unknown): Promise<ExerciseIn[]> {
  if (!Array.isArray(raw)) throw new ApiError(400, "exercises debe ser una lista");
  if (raw.length > 40) throw new ApiError(400, "Máximo 40 ejercicios por rutina");
  const items = raw.map((x, i) => {
    if (!isObj(x) || typeof x.exerciseId !== "string") throw new ApiError(400, `exercises[${i}].exerciseId es obligatorio`);
    return {
      exerciseId: x.exerciseId,
      restSeconds: clamp(Math.round(Number(x.restSeconds ?? 90)), 0, 900),
      notes: x.notes ? String(x.notes).slice(0, 500) : null,
      sets: parseSets(x),
    };
  });
  const ids = [...new Set(items.map((i) => i.exerciseId))];
  if (ids.length) {
    const db = await getDb();
    const found = await db
      .select({ id: s.exercises.id })
      .from(s.exercises)
      .where(and(inArray(s.exercises.id, ids), or(isNull(s.exercises.ownerId), eq(s.exercises.ownerId, userId))));
    const ok = new Set(found.map((f) => f.id));
    const bad = ids.filter((i) => !ok.has(i));
    if (bad.length) throw new ApiError(400, `Ejercicios que no existen: ${bad.join(", ")}. Búscalos con search_exercises o créalos con create_exercise.`);
  }
  return items;
}

async function writeExercises(db: Awaited<ReturnType<typeof getDb>>, routineId: number, items: ExerciseIn[]) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const [re] = await db
      .insert(s.routineExercises)
      .values({ routineId, exerciseId: it.exerciseId, position: i, restSeconds: it.restSeconds, notes: it.notes })
      .returning({ id: s.routineExercises.id });
    await db.insert(s.routineSets).values(it.sets.map((x, k) => ({ routineExerciseId: re.id, position: k, reps: x.reps, weightKg: x.weightKg, type: x.type })));
  }
}

export async function createRoutineApi(userId: number, input: unknown, baseUrl: string) {
  if (!isObj(input)) throw new ApiError(400, "Cuerpo JSON no válido");
  const name = String(input.name ?? "").trim().slice(0, 80);
  if (!name) throw new ApiError(400, "name es obligatorio");
  const color = typeof input.color === "string" && /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : "#f97316";
  const notes = input.notes ? String(input.notes).slice(0, 2000) : null;
  const items = input.exercises === undefined ? [] : await parseExercises(userId, input.exercises);
  const db = await getDb();
  const [r] = await db.insert(s.routines).values({ userId, name, color, notes }).returning({ id: s.routines.id });
  await writeExercises(db, r.id, items);
  revalidateTag(userCacheTag(userId), { expire: 0 });
  return routineView(userId, r.id, baseUrl);
}

/** Cambia nombre/color/notas y, si se envía `exercises`, reemplaza TODOS los ejercicios. */
export async function updateRoutineApi(userId: number, routineId: number, input: unknown, baseUrl: string) {
  if (!isObj(input)) throw new ApiError(400, "Cuerpo JSON no válido");
  const db = await getDb();
  const [own] = await db.select({ id: s.routines.id }).from(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.userId, userId)));
  if (!own) throw new ApiError(404, "Rutina no encontrada");
  const patch: Partial<typeof s.routines.$inferInsert> = {};
  if (typeof input.name === "string" && input.name.trim()) patch.name = input.name.trim().slice(0, 80);
  if (typeof input.color === "string" && /^#[0-9a-f]{6}$/i.test(input.color)) patch.color = input.color;
  if (input.notes !== undefined) patch.notes = input.notes ? String(input.notes).slice(0, 2000) : null;
  const items = input.exercises === undefined ? null : await parseExercises(userId, input.exercises);
  if (Object.keys(patch).length) await db.update(s.routines).set(patch).where(eq(s.routines.id, routineId));
  if (items) {
    await db.delete(s.routineExercises).where(eq(s.routineExercises.routineId, routineId));
    await writeExercises(db, routineId, items);
  }
  revalidateTag(userCacheTag(userId), { expire: 0 });
  return routineView(userId, routineId, baseUrl);
}

export async function routineView(userId: number, routineId: number, baseUrl: string) {
  const r = await getRoutine(userId, routineId);
  if (!r) throw new ApiError(404, "Rutina no encontrada");
  return {
    id: r.id,
    name: r.name,
    notes: r.notes,
    url: `${baseUrl}/rutinas/${r.id}`,
    exercises: r.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      muscle: muscleLabel(e.primaryMuscle),
      equipment: equipmentLabel(e.equipment),
      restSeconds: e.restSeconds,
      notes: e.notes,
      sets: e.sets.map((x) => ({ reps: x.reps, weightKg: x.weightKg, type: x.type })),
    })),
  };
}

export async function listRoutinesApi(userId: number, baseUrl: string) {
  const rs = await listRoutines(userId);
  return rs.map((r) => ({
    id: r.id,
    name: r.name,
    url: `${baseUrl}/rutinas/${r.id}`,
    exerciseCount: r.exerciseCount,
    setCount: r.setCount,
    muscles: r.muscles.map(muscleLabel),
  }));
}

/* ───────────── Hoy, plan y calendario ───────────── */

export async function getDayApi(userId: number, date: string | undefined, baseUrl: string) {
  const day = date ?? todayISO();
  if (!isValidISODate(day)) throw new ApiError(400, "date debe ser AAAA-MM-DD");
  const [cal] = await getCalendar(userId, day, 1);
  const p = cal.planned;
  const routine = p.kind === "workout" && p.routineId ? await routineView(userId, p.routineId, baseUrl).catch(() => null) : null;
  const plan = await getActivePlan(userId);
  return {
    date: day,
    isToday: day === todayISO(),
    kind: p.kind,
    summary:
      p.kind === "workout" ? `Gimnasio: ${p.routineName ?? "rutina"}` : p.kind === "activity" ? `Actividad: ${activityLabel(p.activityType)}` : "Descanso",
    source: p.source,
    week: p.weekIndex !== null && p.source !== "none" ? weekLetter(p.weekIndex) : null,
    label: p.label,
    activityType: p.activityType,
    routine,
    // Enlace listo para enviar: abre la app en la rutina del día (requiere haber iniciado sesión en el móvil).
    link: routine ? routine.url : `${baseUrl}/`,
    appUrl: `${baseUrl}/`,
    hasPlan: Boolean(plan),
    done: {
      sessions: cal.sessions.map((x) => ({ id: x.id, name: x.name, finished: x.finished, durationMin: x.durationMin, kcal: x.kcal, url: `${baseUrl}/sesion/${x.id}` })),
      activities: cal.activities.map((a) => ({ type: activityLabel(a.type), durationMin: a.durationMin, kcal: a.kcal })),
    },
  };
}

export async function getCalendarApi(userId: number, from: string | undefined, days: number | undefined, baseUrl: string) {
  const start = from ?? startOfWeek(todayISO());
  if (!isValidISODate(start)) throw new ApiError(400, "from debe ser AAAA-MM-DD");
  const cal = await getCalendar(userId, start, clamp(Math.round(days ?? 7), 1, 62));
  return cal.map((d) => ({
    date: d.date,
    kind: d.planned.kind,
    routineId: d.planned.routineId,
    routineName: d.planned.routineName,
    routineUrl: d.planned.routineId ? `${baseUrl}/rutinas/${d.planned.routineId}` : null,
    activity: d.planned.kind === "activity" ? activityLabel(d.planned.activityType) : null,
    done: d.sessions.some((x) => x.finished) || d.activities.length > 0,
    sessions: d.sessions.length,
    activities: d.activities.length,
  }));
}

export async function getPlanApi(userId: number) {
  const plan = await getActivePlan(userId);
  if (!plan) return { plan: null };
  const routines = await listRoutines(userId);
  const name = (id: number | null) => routines.find((r) => r.id === id)?.name ?? null;
  return {
    plan: {
      name: plan.name,
      startDate: plan.startDate,
      cycleWeeks: plan.cycleWeeks,
      days: plan.days
        .sort((a, b) => a.weekIndex - b.weekIndex || a.weekday - b.weekday)
        .map((d) => ({
          week: weekLetter(d.weekIndex),
          weekday: d.weekday,
          kind: d.kind,
          routineId: d.routineId,
          routineName: name(d.routineId),
          activity: d.activityType ? activityLabel(d.activityType) : null,
          label: d.label,
        })),
    },
  };
}

/* ───────────── Análisis ───────────── */

export async function getAnalyticsApi(userId: number, weeksParam: number | undefined) {
  const weeks = clamp(Math.round(weeksParam ?? 8), 1, 26);
  const today = todayISO();
  const thisWeek = startOfWeek(today);
  const from = addDays(thisWeek, -7 * (weeks - 1));
  const [days, sets] = await Promise.all([getCalendar(userId, from, weeks * 7), completedSetsInRange(userId, from, addDays(thisWeek, 6))]);

  const perWeek = Array.from({ length: weeks }, (_, i) => {
    const wd = days.slice(i * 7, i * 7 + 7);
    const sum = summarizeDays(wd, today);
    return { weekStart: addDays(from, i * 7), plannedDays: sum.planned, trainedDays: sum.done, gymSessions: sum.gymSessions, activities: sum.activities, minutes: sum.minutes, kcalEstimated: sum.kcal };
  });
  const plannedToDate = days.filter((d) => d.date <= today && d.planned.kind !== "rest").length;
  const doneToDate = days.filter((d) => d.date <= today && d.planned.kind !== "rest" && (d.sessions.some((x) => x.finished) || d.activities.length > 0)).length;

  const last4 = addDays(thisWeek, -21);
  const groups = new Map<MuscleGroup, { sets: number; volumeKg: number; lastDate: string | null }>();
  for (const g of Object.keys(MUSCLE_GROUPS) as MuscleGroup[]) groups.set(g, { sets: 0, volumeKg: 0, lastDate: null });
  const prs = new Map<string, { exercise: string; oneRmKg: number; weightKg: number; reps: number; date: string }>();
  for (const x of sets) {
    const g = groups.get(muscleGroup(x.muscle))!;
    if (x.date >= last4) {
      g.sets++;
      g.volumeKg += x.reps * x.weightKg;
    }
    if (!g.lastDate || x.date > g.lastDate) g.lastDate = x.date;
    if (x.weightKg > 0) {
      const rm = epley1RM(x.weightKg, x.reps);
      const p = prs.get(x.exerciseId);
      if (!p || rm > p.oneRmKg) prs.set(x.exerciseId, { exercise: x.exerciseName, oneRmKg: Math.round(rm * 10) / 10, weightKg: x.weightKg, reps: x.reps, date: x.date });
    }
  }
  return {
    today,
    weeks: perWeek,
    adherencePct: plannedToDate ? Math.round((doneToDate / plannedToDate) * 100) : null,
    muscleGroupsLast4Weeks: [...groups.entries()].map(([g, v]) => ({
      group: MUSCLE_GROUPS[g].label,
      setsPerWeek: Math.round((v.sets / 4) * 10) / 10,
      volumeKgPerWeek: Math.round(v.volumeKg / 4),
      daysSinceLast: v.lastDate ? diffDays(today, v.lastDate) : null,
    })),
    records: [...prs.values()].sort((a, b) => b.oneRmKg - a.oneRmKg).slice(0, 10),
    note: "kcal son una estimación (MET × peso × horas). Referencia habitual para hipertrofia: 10–20 series semanales por grupo.",
  };
}

export async function getExerciseApi(userId: number, id: string) {
  const e = await getExercise(id);
  if (!e || (e.ownerId !== null && e.ownerId !== userId)) throw new ApiError(404, "Ejercicio no encontrado");
  return {
    id: e.id,
    name: e.nameEs ?? e.name,
    nameEn: e.name,
    primaryMuscle: e.primaryMuscle,
    secondaryMuscles: e.secondaryMuscles,
    equipment: e.equipment,
    instructions: e.instructions,
  };
}

/** Valores válidos para crear ejercicios. */
export function metaApi() {
  return {
    muscles: Object.entries(MUSCLES).map(([code, v]) => ({ code, label: v.label, group: v.group })),
    equipment: Object.entries(EQUIPMENT).map(([code, label]) => ({ code, label })),
    setTypes: ["normal", "warmup", "dropset", "failure"],
  };
}

/* ───────────── Plan (escritura) ───────────── */

/** Crea o actualiza el plan activo (ciclo de 1 a 8 semanas). */
export async function setPlanApi(userId: number, input: Record<string, unknown>) {
  const name = String(input.name ?? "").trim().slice(0, 80) || "Mi plan";
  const startDate = isValidISODate(input.startDate) ? input.startDate : todayISO();
  const cycleWeeks = clamp(Math.round(Number(input.cycleWeeks) || 1), 1, 8);
  const db = await getDb();
  const [plan] = await db.select().from(s.plans).where(and(eq(s.plans.userId, userId), eq(s.plans.isActive, true))).limit(1);
  if (plan) {
    await db.update(s.plans).set({ name, startDate, cycleWeeks }).where(eq(s.plans.id, plan.id));
    await db.delete(s.planDays).where(and(eq(s.planDays.planId, plan.id), sql`${s.planDays.weekIndex} >= ${cycleWeeks}`));
  } else {
    await db.insert(s.plans).values({ userId, name, startDate, cycleWeeks });
  }
  revalidateTag(userCacheTag(userId), { expire: 0 });
  return getPlanApi(userId);
}

/** Define qué toca un día del plan. `week` es la letra (A, B…) o el índice desde 0; `weekday` 1=lunes … 7=domingo. */
export async function setPlanDayApi(userId: number, input: Record<string, unknown>) {
  const db = await getDb();
  const [plan] = await db.select().from(s.plans).where(and(eq(s.plans.userId, userId), eq(s.plans.isActive, true))).limit(1);
  if (!plan) throw new ApiError(400, "No hay plan activo. Crea uno con set_plan.");
  const w = String(input.week ?? "A").trim().toUpperCase();
  const weekIndex = /^[A-H]$/.test(w) ? w.charCodeAt(0) - 65 : Number(w);
  const weekday = Number(input.weekday);
  if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex >= plan.cycleWeeks) throw new ApiError(400, `week debe estar entre A y ${weekLetter(plan.cycleWeeks - 1)}`);
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) throw new ApiError(400, "weekday debe ser 1 (lunes) a 7 (domingo)");
  const kind = String(input.kind ?? "");
  if (!["workout", "rest", "activity"].includes(kind)) throw new ApiError(400, "kind debe ser workout, rest o activity");
  let routineId: number | null = null;
  if (kind === "workout") {
    routineId = Number(input.routineId);
    const [r] = await db.select({ id: s.routines.id }).from(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.userId, userId)));
    if (!r) throw new ApiError(400, "routineId no existe");
  }
  const activityType = kind === "activity" ? String(input.activityType ?? "") : null;
  if (kind === "activity" && !ACTIVITY_TYPES[activityType!]) throw new ApiError(400, `activityType no válido. Valores: ${Object.keys(ACTIVITY_TYPES).filter((k) => k !== "gym").join(", ")}`);
  const v = { kind, routineId, activityType, label: input.label ? String(input.label).trim().slice(0, 60) : null };
  await db
    .insert(s.planDays)
    .values({ planId: plan.id, weekIndex, weekday, ...v })
    .onConflictDoUpdate({ target: [s.planDays.planId, s.planDays.weekIndex, s.planDays.weekday], set: v });
  revalidateTag(userCacheTag(userId), { expire: 0 });
  return getPlanApi(userId);
}
