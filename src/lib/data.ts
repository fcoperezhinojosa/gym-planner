import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { resolveDay, type DaySlot, type DayKind } from "./schedule";
import { range } from "./dates";

export type ExerciseLite = {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  category: string;
  image: string | null;
};

export async function listExercisesLite(userId: number): Promise<ExerciseLite[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: s.exercises.id,
      name: s.exercises.name,
      nameEs: s.exercises.nameEs,
      primaryMuscle: s.exercises.primaryMuscle,
      equipment: s.exercises.equipment,
      category: s.exercises.category,
      images: s.exercises.images,
      ownerId: s.exercises.ownerId,
    })
    .from(s.exercises)
    .orderBy(asc(sql`coalesce(${s.exercises.nameEs}, ${s.exercises.name})`));
  return rows
    .filter((r) => r.ownerId === null || r.ownerId === userId)
    .map((r) => ({
      id: r.id,
      name: r.nameEs ?? r.name,
      primaryMuscle: r.primaryMuscle,
      equipment: r.equipment,
      category: r.category,
      image: r.images[0] ?? null,
    }));
}

export async function getExercise(id: string) {
  const db = await getDb();
  const [e] = await db.select().from(s.exercises).where(eq(s.exercises.id, id));
  return e ?? null;
}

/* ───────────── Rutinas ───────────── */

export async function listRoutines(userId: number) {
  const db = await getDb();
  const routines = await db.select().from(s.routines).where(eq(s.routines.userId, userId)).orderBy(asc(s.routines.name));
  if (!routines.length) return [];
  const items = await db
    .select({
      routineId: s.routineExercises.routineId,
      muscle: s.exercises.primaryMuscle,
      sets: sql<number>`(select count(*)::int from ${s.routineSets} where ${s.routineSets.routineExerciseId} = ${s.routineExercises.id})`,
    })
    .from(s.routineExercises)
    .innerJoin(s.exercises, eq(s.exercises.id, s.routineExercises.exerciseId))
    .where(inArray(s.routineExercises.routineId, routines.map((r) => r.id)));
  return routines.map((r) => {
    const mine = items.filter((i) => i.routineId === r.id);
    return {
      ...r,
      exerciseCount: mine.length,
      setCount: mine.reduce((a, i) => a + i.sets, 0),
      muscles: [...new Set(mine.map((i) => i.muscle))],
    };
  });
}

export type RoutineDetail = NonNullable<Awaited<ReturnType<typeof getRoutine>>>;

export async function getRoutine(userId: number, routineId: number) {
  const db = await getDb();
  const [routine] = await db
    .select()
    .from(s.routines)
    .where(and(eq(s.routines.id, routineId), eq(s.routines.userId, userId)));
  if (!routine) return null;
  const exs = await db
    .select({
      id: s.routineExercises.id,
      exerciseId: s.routineExercises.exerciseId,
      position: s.routineExercises.position,
      restSeconds: s.routineExercises.restSeconds,
      notes: s.routineExercises.notes,
      name: s.exercises.name,
      nameEs: s.exercises.nameEs,
      primaryMuscle: s.exercises.primaryMuscle,
      equipment: s.exercises.equipment,
      images: s.exercises.images,
    })
    .from(s.routineExercises)
    .innerJoin(s.exercises, eq(s.exercises.id, s.routineExercises.exerciseId))
    .where(eq(s.routineExercises.routineId, routineId))
    .orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id));
  const sets = exs.length
    ? await db
        .select()
        .from(s.routineSets)
        .where(inArray(s.routineSets.routineExerciseId, exs.map((e) => e.id)))
        .orderBy(asc(s.routineSets.position), asc(s.routineSets.id))
    : [];
  return {
    ...routine,
    exercises: exs.map((e) => ({
      ...e,
      name: e.nameEs ?? e.name,
      image: e.images[0] ?? null,
      sets: sets
        .filter((x) => x.routineExerciseId === e.id)
        .map((x) => ({ id: x.id, reps: x.reps, weightKg: x.weightKg, type: x.type })),
    })),
  };
}

/* ───────────── Plan y calendario ───────────── */

export async function getActivePlan(userId: number) {
  const db = await getDb();
  const [plan] = await db
    .select()
    .from(s.plans)
    .where(and(eq(s.plans.userId, userId), eq(s.plans.isActive, true)))
    .orderBy(desc(s.plans.id))
    .limit(1);
  if (!plan) return null;
  const days = await db.select().from(s.planDays).where(eq(s.planDays.planId, plan.id));
  return {
    ...plan,
    days: days.map((d) => ({ ...d, kind: d.kind as DayKind })),
  };
}

export async function getOverrides(userId: number, from: string, to: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(s.calendarOverrides)
    .where(and(eq(s.calendarOverrides.userId, userId), gte(s.calendarOverrides.date, from), lte(s.calendarOverrides.date, to)));
  return rows.map((r) => ({ ...r, kind: r.kind as DayKind }));
}

export type CalendarDay = {
  date: string;
  planned: DaySlot & { source: string; weekIndex: number | null; routineName: string | null; routineColor: string | null };
  sessions: { id: number; name: string; kcal: number | null; durationMin: number | null; finished: boolean }[];
  activities: { id: number; type: string; durationMin: number; kcal: number }[];
};

/** Lo planificado + lo hecho para un rango de días. */
export async function getCalendar(userId: number, from: string, days: number): Promise<CalendarDay[]> {
  const dates = range(from, days);
  const to = dates[dates.length - 1];
  const db = await getDb();
  const [plan, overrides, routines, sessions, acts] = await Promise.all([
    getActivePlan(userId),
    getOverrides(userId, from, to),
    db.select({ id: s.routines.id, name: s.routines.name, color: s.routines.color }).from(s.routines).where(eq(s.routines.userId, userId)),
    db
      .select()
      .from(s.workoutSessions)
      .where(and(eq(s.workoutSessions.userId, userId), gte(s.workoutSessions.date, from), lte(s.workoutSessions.date, to))),
    db.select().from(s.activities).where(and(eq(s.activities.userId, userId), gte(s.activities.date, from), lte(s.activities.date, to))),
  ]);
  return dates.map((date) => {
    const r = resolveDay(date, plan, plan?.days ?? [], overrides);
    const routine = r.routineId ? routines.find((x) => x.id === r.routineId) : null;
    return {
      date,
      planned: { ...r, routineName: routine?.name ?? null, routineColor: routine?.color ?? null },
      sessions: sessions
        .filter((x) => x.date === date)
        .map((x) => ({ id: x.id, name: x.name, kcal: x.kcal, durationMin: x.durationMin, finished: x.endedAt !== null })),
      activities: acts.filter((a) => a.date === date).map((a) => ({ id: a.id, type: a.type, durationMin: a.durationMin, kcal: a.kcal })),
    };
  });
}

/* ───────────── Sesiones ───────────── */

export async function getOpenSession(userId: number) {
  const db = await getDb();
  const [open] = await db
    .select({ id: s.workoutSessions.id, name: s.workoutSessions.name, startedAt: s.workoutSessions.startedAt })
    .from(s.workoutSessions)
    .where(and(eq(s.workoutSessions.userId, userId), sql`${s.workoutSessions.endedAt} is null`))
    .orderBy(desc(s.workoutSessions.startedAt))
    .limit(1);
  return open ?? null;
}

export type SessionDetail = NonNullable<Awaited<ReturnType<typeof getSessionDetail>>>;

export async function getSessionDetail(userId: number, sessionId: number) {
  const db = await getDb();
  const [session] = await db
    .select()
    .from(s.workoutSessions)
    .where(and(eq(s.workoutSessions.id, sessionId), eq(s.workoutSessions.userId, userId)));
  if (!session) return null;
  const exs = await db
    .select({
      id: s.sessionExercises.id,
      exerciseId: s.sessionExercises.exerciseId,
      position: s.sessionExercises.position,
      restSeconds: s.sessionExercises.restSeconds,
      name: s.exercises.name,
      nameEs: s.exercises.nameEs,
      primaryMuscle: s.exercises.primaryMuscle,
      equipment: s.exercises.equipment,
      images: s.exercises.images,
    })
    .from(s.sessionExercises)
    .innerJoin(s.exercises, eq(s.exercises.id, s.sessionExercises.exerciseId))
    .where(eq(s.sessionExercises.sessionId, sessionId))
    .orderBy(asc(s.sessionExercises.position), asc(s.sessionExercises.id));
  const sets = exs.length
    ? await db
        .select()
        .from(s.sessionSets)
        .where(inArray(s.sessionSets.sessionExerciseId, exs.map((e) => e.id)))
        .orderBy(asc(s.sessionSets.position), asc(s.sessionSets.id))
    : [];
  return {
    ...session,
    exercises: exs.map((e) => ({
      ...e,
      name: e.nameEs ?? e.name,
      image: e.images[0] ?? null,
      sets: sets
        .filter((x) => x.sessionExerciseId === e.id)
        .map((x) => ({ id: x.id, reps: x.reps, weightKg: x.weightKg, type: x.type, completed: x.completed })),
    })),
  };
}

/**
 * Para cada ejercicio, las series de la última sesión terminada en la que apareció.
 * Se usa para prellenar pesos (sobrecarga progresiva) y mostrar "la última vez".
 */
export async function lastSetsByExercise(userId: number, exerciseIds: string[], excludeSessionId?: number) {
  const out = new Map<string, { date: string; sets: { reps: number; weightKg: number; completed: boolean }[] }>();
  if (!exerciseIds.length) return out;
  const db = await getDb();
  const rows = await db
    .select({
      exerciseId: s.sessionExercises.exerciseId,
      sessionExerciseId: s.sessionExercises.id,
      sessionId: s.workoutSessions.id,
      date: s.workoutSessions.date,
      startedAt: s.workoutSessions.startedAt,
    })
    .from(s.sessionExercises)
    .innerJoin(s.workoutSessions, eq(s.workoutSessions.id, s.sessionExercises.sessionId))
    .where(
      and(
        eq(s.workoutSessions.userId, userId),
        inArray(s.sessionExercises.exerciseId, exerciseIds),
        isNotNull(s.workoutSessions.endedAt),
      ),
    )
    .orderBy(desc(s.workoutSessions.date), desc(s.workoutSessions.startedAt));
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.sessionId === excludeSessionId) continue;
    if (!latest.has(r.exerciseId)) latest.set(r.exerciseId, r);
  }
  if (!latest.size) return out;
  const sets = await db
    .select()
    .from(s.sessionSets)
    .where(inArray(s.sessionSets.sessionExerciseId, [...latest.values()].map((r) => r.sessionExerciseId)))
    .orderBy(asc(s.sessionSets.position), asc(s.sessionSets.id));
  for (const [exId, r] of latest) {
    out.set(exId, {
      date: r.date,
      sets: sets
        .filter((x) => x.sessionExerciseId === r.sessionExerciseId)
        .map((x) => ({ reps: x.reps, weightKg: x.weightKg, completed: x.completed })),
    });
  }
  return out;
}

export async function exerciseHistory(userId: number, exerciseId: string) {
  const db = await getDb();
  return db
    .select({
      date: s.workoutSessions.date,
      sessionId: s.workoutSessions.id,
      reps: s.sessionSets.reps,
      weightKg: s.sessionSets.weightKg,
    })
    .from(s.sessionSets)
    .innerJoin(s.sessionExercises, eq(s.sessionExercises.id, s.sessionSets.sessionExerciseId))
    .innerJoin(s.workoutSessions, eq(s.workoutSessions.id, s.sessionExercises.sessionId))
    .where(
      and(
        eq(s.workoutSessions.userId, userId),
        eq(s.sessionExercises.exerciseId, exerciseId),
        eq(s.sessionSets.completed, true),
        isNotNull(s.workoutSessions.endedAt),
      ),
    )
    .orderBy(asc(s.workoutSessions.date));
}

/** Series completadas en un rango, con su músculo, para la analítica. */
export async function completedSetsInRange(userId: number, from: string, to: string) {
  const db = await getDb();
  return db
    .select({
      date: s.workoutSessions.date,
      exerciseId: s.sessionExercises.exerciseId,
      exerciseName: sql<string>`coalesce(${s.exercises.nameEs}, ${s.exercises.name})`,
      muscle: s.exercises.primaryMuscle,
      reps: s.sessionSets.reps,
      weightKg: s.sessionSets.weightKg,
    })
    .from(s.sessionSets)
    .innerJoin(s.sessionExercises, eq(s.sessionExercises.id, s.sessionSets.sessionExerciseId))
    .innerJoin(s.workoutSessions, eq(s.workoutSessions.id, s.sessionExercises.sessionId))
    .innerJoin(s.exercises, eq(s.exercises.id, s.sessionExercises.exerciseId))
    .where(
      and(
        eq(s.workoutSessions.userId, userId),
        eq(s.sessionSets.completed, true),
        isNotNull(s.workoutSessions.endedAt),
        gte(s.workoutSessions.date, from),
        lte(s.workoutSessions.date, to),
      ),
    );
}
