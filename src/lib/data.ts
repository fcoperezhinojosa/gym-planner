import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { cacheTags } from "./cache-tags";
import { resolveDay, type DaySlot, type DayKind } from "./schedule";
import { range } from "./dates";
import type { EnergyDay } from "./energy";

export type ExerciseLite = {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  category: string;
  image: string | null;
};

type ExerciseLiteRow = {
  id: string;
  name: string;
  nameEs: string | null;
  primaryMuscle: string;
  equipment: string;
  category: string;
  images: string[];
};

const toExerciseLite = (r: ExerciseLiteRow): ExerciseLite => ({
  id: r.id,
  name: r.nameEs ?? r.name,
  primaryMuscle: r.primaryMuscle,
  equipment: r.equipment,
  category: r.category,
  image: r.images[0] ?? null,
});

const exerciseLiteColumns = {
  id: s.exercises.id,
  name: s.exercises.name,
  nameEs: s.exercises.nameEs,
  primaryMuscle: s.exercises.primaryMuscle,
  equipment: s.exercises.equipment,
  category: s.exercises.category,
  images: s.exercises.images,
};

export async function listBaseExercisesLite(): Promise<ExerciseLite[]> {
  "use cache";
  cacheLife("max");
  cacheTag("exercises-base");
  const db = await getDb();
  const rows = await db
    .select(exerciseLiteColumns)
    .from(s.exercises)
    .where(isNull(s.exercises.ownerId))
    .orderBy(asc(sql`coalesce(${s.exercises.nameEs}, ${s.exercises.name})`));
  return rows.map(toExerciseLite);
}

export async function listUserExercisesLite(userId: number): Promise<ExerciseLite[]> {
  "use cache: remote";
  cacheLife("days");
  cacheTag(cacheTags.exercises(userId));
  const db = await getDb();
  const rows = await db
    .select(exerciseLiteColumns)
    .from(s.exercises)
    .where(eq(s.exercises.ownerId, userId))
    .orderBy(asc(sql`coalesce(${s.exercises.nameEs}, ${s.exercises.name})`));
  return rows.map(toExerciseLite);
}

export async function listExercisesLite(userId: number): Promise<ExerciseLite[]> {
  const [base, custom] = await Promise.all([listBaseExercisesLite(), listUserExercisesLite(userId)]);
  if (custom.length === 0) return base;
  return [...custom, ...base].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getExercise(id: string) {
  "use cache: remote";
  cacheLife("days");
  cacheTag(cacheTags.exercise(id));
  const db = await getDb();
  const [e] = await db.select().from(s.exercises).where(eq(s.exercises.id, id));
  return e ?? null;
}

/* ───────────── Rutinas ───────────── */

export async function listRoutineOptions(userId: number): Promise<{ id: number; name: string; color: string }[]> {
  "use cache: remote";
  cacheLife("days");
  cacheTag(cacheTags.routineOptions(userId));
  const db = await getDb();
  return db
    .select({ id: s.routines.id, name: s.routines.name, color: s.routines.color })
    .from(s.routines)
    .where(eq(s.routines.userId, userId))
    .orderBy(asc(s.routines.name));
}

export async function listRoutines(userId: number) {
  "use cache: remote";
  cacheLife("days");
  cacheTag(cacheTags.routines(userId));
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
  "use cache: remote";
  cacheLife("days");
  cacheTag(cacheTags.routine(routineId));
  const db = await getDb();
  const rows = await db
    .select({
      routine: s.routines,
      ex: {
        id: s.routineExercises.id,
        exerciseId: s.routineExercises.exerciseId,
        position: s.routineExercises.position,
        restSeconds: s.routineExercises.restSeconds,
        notes: s.routineExercises.notes,
      },
      info: {
        name: s.exercises.name,
        nameEs: s.exercises.nameEs,
        primaryMuscle: s.exercises.primaryMuscle,
        equipment: s.exercises.equipment,
        images: s.exercises.images,
      },
      set: {
        id: s.routineSets.id,
        reps: s.routineSets.reps,
        weightKg: s.routineSets.weightKg,
        type: s.routineSets.type,
      },
    })
    .from(s.routines)
    .leftJoin(s.routineExercises, eq(s.routineExercises.routineId, s.routines.id))
    .leftJoin(s.exercises, eq(s.exercises.id, s.routineExercises.exerciseId))
    .leftJoin(s.routineSets, eq(s.routineSets.routineExerciseId, s.routineExercises.id))
    .where(and(eq(s.routines.id, routineId), eq(s.routines.userId, userId)))
    .orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id), asc(s.routineSets.position), asc(s.routineSets.id));
  if (!rows.length) return null;

  type RoutineExerciseOut = {
    id: number;
    exerciseId: string;
    position: number;
    restSeconds: number;
    notes: string | null;
    name: string;
    nameEs: string | null;
    primaryMuscle: string;
    equipment: string;
    images: string[];
    image: string | null;
    sets: { id: number; reps: number; weightKg: number; type: string }[];
  };
  const exercisesMap = new Map<number, RoutineExerciseOut>();
  for (const row of rows) {
    if (!row.ex || row.ex.id === null || row.ex.exerciseId === null || row.ex.position === null || row.ex.restSeconds === null) continue;
    const exId = row.ex.id;
    let ex = exercisesMap.get(exId);
    if (!ex) {
      const info = row.info;
      ex = {
        id: exId,
        exerciseId: row.ex.exerciseId,
        position: row.ex.position,
        restSeconds: row.ex.restSeconds,
        notes: row.ex.notes,
        name: info?.nameEs ?? info?.name ?? "",
        nameEs: info?.nameEs ?? null,
        primaryMuscle: info?.primaryMuscle ?? "",
        equipment: info?.equipment ?? "other",
        images: info?.images ?? [],
        image: info?.images[0] ?? null,
        sets: [],
      };
      exercisesMap.set(exId, ex);
    }
    if (row.set && row.set.id !== null && row.set.reps !== null && row.set.weightKg !== null && row.set.type !== null) {
      ex.sets.push({
        id: row.set.id,
        reps: row.set.reps,
        weightKg: row.set.weightKg,
        type: row.set.type,
      });
    }
  }
  return {
    ...rows[0].routine,
    exercises: [...exercisesMap.values()],
  };
}

/* ───────────── Plan y calendario ───────────── */

export async function getActivePlan(userId: number) {
  "use cache: remote";
  cacheLife("days");
  cacheTag(cacheTags.plan(userId));
  const db = await getDb();
  const activePlan = db.$with("active_plan").as(
    db
      .select()
      .from(s.plans)
      .where(and(eq(s.plans.userId, userId), eq(s.plans.isActive, true)))
      .orderBy(desc(s.plans.id))
      .limit(1),
  );
  const rows = await db
    .with(activePlan)
    .select({
      plan: {
        id: activePlan.id,
        userId: activePlan.userId,
        name: activePlan.name,
        startDate: activePlan.startDate,
        cycleWeeks: activePlan.cycleWeeks,
        isActive: activePlan.isActive,
      },
      day: s.planDays,
    })
    .from(activePlan)
    .leftJoin(s.planDays, eq(s.planDays.planId, activePlan.id));
  if (!rows.length) return null;
  return {
    ...rows[0].plan,
    days: rows.flatMap((r) => (r.day ? [{ ...r.day, kind: r.day.kind as DayKind }] : [])),
  };
}

export async function getOverrides(userId: number, from: string, to: string) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.calendar(userId));
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

type CalendarSessionRow = {
  id: number;
  date: string;
  name: string;
  kcal: number | null;
  durationMin: number | null;
  endedAt: Date | null;
};

type CalendarActivityRow = {
  id: number;
  date: string;
  type: string;
  durationMin: number;
  kcal: number;
};

function assembleCalendarDays(
  dates: string[],
  plan: Awaited<ReturnType<typeof getActivePlan>>,
  overrides: Awaited<ReturnType<typeof getOverrides>>,
  routines: Awaited<ReturnType<typeof listRoutineOptions>>,
  sessions: CalendarSessionRow[],
  acts: CalendarActivityRow[],
): CalendarDay[] {
  const routineById = new Map(routines.map((r) => [r.id, r]));
  const sessionsByDate = new Map<string, CalendarDay["sessions"]>();
  for (const x of sessions) {
    const item = { id: x.id, name: x.name, kcal: x.kcal, durationMin: x.durationMin, finished: x.endedAt !== null };
    const arr = sessionsByDate.get(x.date);
    if (arr) arr.push(item);
    else sessionsByDate.set(x.date, [item]);
  }
  const actsByDate = new Map<string, CalendarDay["activities"]>();
  for (const a of acts) {
    const item = { id: a.id, type: a.type, durationMin: a.durationMin, kcal: a.kcal };
    const arr = actsByDate.get(a.date);
    if (arr) arr.push(item);
    else actsByDate.set(a.date, [item]);
  }
  return dates.map((date) => {
    const r = resolveDay(date, plan, plan?.days ?? [], overrides);
    const routine = r.routineId ? routineById.get(r.routineId) : null;
    return {
      date,
      planned: { ...r, routineName: routine?.name ?? null, routineColor: routine?.color ?? null },
      sessions: sessionsByDate.get(date) ?? [],
      activities: actsByDate.get(date) ?? [],
    };
  });
}

/** Lo planificado + lo hecho para un rango de días. */
export async function getCalendar(userId: number, from: string, days: number): Promise<CalendarDay[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.calendar(userId));
  const dates = range(from, days);
  const to = dates[dates.length - 1];
  const db = await getDb();
  const [plan, overrides, routines, sessions, acts] = await Promise.all([
    getActivePlan(userId),
    getOverrides(userId, from, to),
    listRoutineOptions(userId),
    db
      .select({
        id: s.workoutSessions.id,
        date: s.workoutSessions.date,
        name: s.workoutSessions.name,
        kcal: s.workoutSessions.kcal,
        durationMin: s.workoutSessions.durationMin,
        endedAt: s.workoutSessions.endedAt,
      })
      .from(s.workoutSessions)
      .where(and(eq(s.workoutSessions.userId, userId), gte(s.workoutSessions.date, from), lte(s.workoutSessions.date, to))),
    db
      .select({
        id: s.activities.id,
        date: s.activities.date,
        type: s.activities.type,
        durationMin: s.activities.durationMin,
        kcal: s.activities.kcal,
      })
      .from(s.activities)
      .where(and(eq(s.activities.userId, userId), gte(s.activities.date, from), lte(s.activities.date, to))),
  ]);
  return assembleCalendarDays(dates, plan, overrides, routines, sessions, acts);
}

/* ───────────── Sesiones ───────────── */

export async function getOpenSession(userId: number) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.openSession(userId));
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
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.session(sessionId));
  const db = await getDb();
  const rows = await db
    .select({
      session: s.workoutSessions,
      ex: {
        id: s.sessionExercises.id,
        exerciseId: s.sessionExercises.exerciseId,
        position: s.sessionExercises.position,
        restSeconds: s.sessionExercises.restSeconds,
        notes: s.sessionExercises.notes,
      },
      info: {
        name: s.exercises.name,
        nameEs: s.exercises.nameEs,
        primaryMuscle: s.exercises.primaryMuscle,
        equipment: s.exercises.equipment,
        images: s.exercises.images,
      },
      set: {
        id: s.sessionSets.id,
        reps: s.sessionSets.reps,
        weightKg: s.sessionSets.weightKg,
        type: s.sessionSets.type,
        completed: s.sessionSets.completed,
      },
    })
    .from(s.workoutSessions)
    .leftJoin(s.sessionExercises, eq(s.sessionExercises.sessionId, s.workoutSessions.id))
    .leftJoin(s.exercises, eq(s.exercises.id, s.sessionExercises.exerciseId))
    .leftJoin(s.sessionSets, eq(s.sessionSets.sessionExerciseId, s.sessionExercises.id))
    .where(and(eq(s.workoutSessions.id, sessionId), eq(s.workoutSessions.userId, userId)))
    .orderBy(asc(s.sessionExercises.position), asc(s.sessionExercises.id), asc(s.sessionSets.position), asc(s.sessionSets.id));
  if (!rows.length) return null;

  type SessionExerciseOut = {
    id: number;
    exerciseId: string;
    position: number;
    restSeconds: number;
    notes: string | null;
    name: string;
    nameEs: string | null;
    primaryMuscle: string;
    equipment: string;
    images: string[];
    image: string | null;
    sets: { id: number; reps: number; weightKg: number; type: string; completed: boolean }[];
  };
  const exercisesMap = new Map<number, SessionExerciseOut>();
  for (const row of rows) {
    if (!row.ex || row.ex.id === null || row.ex.exerciseId === null || row.ex.position === null || row.ex.restSeconds === null) continue;
    const exId = row.ex.id;
    let ex = exercisesMap.get(exId);
    if (!ex) {
      const info = row.info;
      ex = {
        id: exId,
        exerciseId: row.ex.exerciseId,
        position: row.ex.position,
        restSeconds: row.ex.restSeconds,
        notes: row.ex.notes,
        name: info?.nameEs ?? info?.name ?? "",
        nameEs: info?.nameEs ?? null,
        primaryMuscle: info?.primaryMuscle ?? "",
        equipment: info?.equipment ?? "other",
        images: info?.images ?? [],
        image: info?.images[0] ?? null,
        sets: [],
      };
      exercisesMap.set(exId, ex);
    }
    if (
      row.set &&
      row.set.id !== null &&
      row.set.reps !== null &&
      row.set.weightKg !== null &&
      row.set.type !== null &&
      row.set.completed !== null
    ) {
      ex.sets.push({
        id: row.set.id,
        reps: row.set.reps,
        weightKg: row.set.weightKg,
        type: row.set.type,
        completed: row.set.completed,
      });
    }
  }
  return {
    ...rows[0].session,
    exercises: [...exercisesMap.values()],
  };
}

/**
 * Para cada ejercicio, las series de la última sesión terminada en la que apareció.
 * Se usa para prellenar pesos (sobrecarga progresiva) y mostrar "la última vez".
 */
export async function lastSetsByExercise(userId: number, exerciseIds: string[], excludeSessionId?: number) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.analytics(userId));
  const out = new Map<string, { date: string; sets: { reps: number; weightKg: number; completed: boolean }[] }>();
  const uniqueIds = [...new Set(exerciseIds)];
  if (!uniqueIds.length) return out;
  const db = await getDb();
  const latest = db.$with("latest").as(
    db
      .selectDistinctOn([s.sessionExercises.exerciseId], {
        exerciseId: s.sessionExercises.exerciseId,
        sessionExerciseId: s.sessionExercises.id,
        date: s.workoutSessions.date,
      })
      .from(s.sessionExercises)
      .innerJoin(s.workoutSessions, eq(s.workoutSessions.id, s.sessionExercises.sessionId))
      .where(
        and(
          eq(s.workoutSessions.userId, userId),
          inArray(s.sessionExercises.exerciseId, uniqueIds),
          isNotNull(s.workoutSessions.endedAt),
          excludeSessionId !== undefined ? ne(s.workoutSessions.id, excludeSessionId) : undefined,
        ),
      )
      .orderBy(
        asc(s.sessionExercises.exerciseId),
        desc(s.workoutSessions.date),
        desc(s.workoutSessions.startedAt),
        desc(s.sessionExercises.id),
      ),
  );
  const rows = await db
    .with(latest)
    .select({
      exerciseId: latest.exerciseId,
      date: latest.date,
      setId: s.sessionSets.id,
      reps: s.sessionSets.reps,
      weightKg: s.sessionSets.weightKg,
      completed: s.sessionSets.completed,
    })
    .from(latest)
    .leftJoin(s.sessionSets, eq(s.sessionSets.sessionExerciseId, latest.sessionExerciseId))
    .orderBy(asc(latest.exerciseId), asc(s.sessionSets.position), asc(s.sessionSets.id));
  for (const r of rows) {
    let entry = out.get(r.exerciseId);
    if (!entry) {
      entry = { date: r.date, sets: [] };
      out.set(r.exerciseId, entry);
    }
    if (r.setId !== null && r.reps !== null && r.weightKg !== null && r.completed !== null) {
      entry.sets.push({ reps: r.reps, weightKg: r.weightKg, completed: r.completed });
    }
  }
  return out;
}

export async function exerciseHistory(userId: number, exerciseId: string) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.analytics(userId));
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
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.analytics(userId));
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

/* ───────────── Balance energético ───────────── */

function assembleEnergyDays(
  dates: string[],
  sessions: { date: string; kcal: number | null; endedAt?: Date | null }[],
  acts: { date: string; type: string; kcal: number }[],
  intake: { date: string; kcal: number }[],
): EnergyDay[] {
  const byDate = new Map<string, EnergyDay>(dates.map((date) => [date, { date, gym: 0, other: 0, intake: null }]));
  for (const x of sessions) {
    if (x.endedAt === null) continue;
    const d = byDate.get(x.date);
    if (d) d.gym += x.kcal ?? 0;
  }
  for (const a of acts) {
    const d = byDate.get(a.date);
    if (!d) continue;
    if (a.type === "gym") d.gym += a.kcal;
    else d.other += a.kcal;
  }
  for (const i of intake) {
    const d = byDate.get(i.date);
    if (d) d.intake = i.kcal;
  }
  return [...byDate.values()];
}

/** kcal de ejercicio (gym / otras) y consumidas, día a día, en [from, from + days). */
export async function getEnergyDays(userId: number, from: string, days: number): Promise<EnergyDay[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.energy(userId));
  const dates = range(from, days);
  const to = dates[dates.length - 1];
  const db = await getDb();
  const [sessions, acts, intake] = await Promise.all([
    db
      .select({ date: s.workoutSessions.date, kcal: s.workoutSessions.kcal })
      .from(s.workoutSessions)
      .where(and(eq(s.workoutSessions.userId, userId), isNotNull(s.workoutSessions.endedAt), gte(s.workoutSessions.date, from), lte(s.workoutSessions.date, to))),
    db
      .select({ date: s.activities.date, type: s.activities.type, kcal: s.activities.kcal })
      .from(s.activities)
      .where(and(eq(s.activities.userId, userId), gte(s.activities.date, from), lte(s.activities.date, to))),
    db
      .select({ date: s.intakeLogs.date, kcal: s.intakeLogs.kcal })
      .from(s.intakeLogs)
      .where(and(eq(s.intakeLogs.userId, userId), gte(s.intakeLogs.date, from), lte(s.intakeLogs.date, to))),
  ]);
  return assembleEnergyDays(dates, sessions, acts, intake);
}

/** Calendario y balance energético compartiendo las consultas a `workout_sessions` y `activities`. */
export async function getCalendarAndEnergy(
  userId: number,
  calFrom: string,
  calDays: number,
  energyFrom: string,
  energyDaysCount: number,
): Promise<{ calendar: CalendarDay[]; energy: EnergyDay[] }> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.calendar(userId), cacheTags.energy(userId));
  const calDates = range(calFrom, calDays);
  const calTo = calDates[calDates.length - 1];
  const energyDates = range(energyFrom, energyDaysCount);
  const energyTo = energyDates[energyDates.length - 1];
  const minFrom = calFrom < energyFrom ? calFrom : energyFrom;
  const maxTo = calTo > energyTo ? calTo : energyTo;
  const db = await getDb();
  const [plan, overrides, routines, sessions, acts, intake] = await Promise.all([
    getActivePlan(userId),
    getOverrides(userId, calFrom, calTo),
    listRoutineOptions(userId),
    db
      .select({
        id: s.workoutSessions.id,
        date: s.workoutSessions.date,
        name: s.workoutSessions.name,
        kcal: s.workoutSessions.kcal,
        durationMin: s.workoutSessions.durationMin,
        endedAt: s.workoutSessions.endedAt,
      })
      .from(s.workoutSessions)
      .where(and(eq(s.workoutSessions.userId, userId), gte(s.workoutSessions.date, minFrom), lte(s.workoutSessions.date, maxTo))),
    db
      .select({
        id: s.activities.id,
        date: s.activities.date,
        type: s.activities.type,
        durationMin: s.activities.durationMin,
        kcal: s.activities.kcal,
      })
      .from(s.activities)
      .where(and(eq(s.activities.userId, userId), gte(s.activities.date, minFrom), lte(s.activities.date, maxTo))),
    db
      .select({ date: s.intakeLogs.date, kcal: s.intakeLogs.kcal })
      .from(s.intakeLogs)
      .where(and(eq(s.intakeLogs.userId, userId), gte(s.intakeLogs.date, energyFrom), lte(s.intakeLogs.date, energyTo))),
  ]);
  return {
    calendar: assembleCalendarDays(calDates, plan, overrides, routines, sessions, acts),
    energy: assembleEnergyDays(energyDates, sessions, acts, intake),
  };
}

export async function listActivities(userId: number, limit = 50) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.activities(userId));
  const db = await getDb();
  return db
    .select()
    .from(s.activities)
    .where(eq(s.activities.userId, userId))
    .orderBy(desc(s.activities.date), desc(s.activities.id))
    .limit(limit);
}

export async function listRoutineExerciseIds(userId: number, routineId: number): Promise<string[] | null> {
  "use cache: remote";
  cacheLife("days");
  cacheTag(cacheTags.routine(routineId));
  const db = await getDb();
  const [own] = await db
    .select({ id: s.routines.id })
    .from(s.routines)
    .where(and(eq(s.routines.id, routineId), eq(s.routines.userId, userId)));
  if (!own) return null;
  const rows = await db
    .select({ exerciseId: s.routineExercises.exerciseId })
    .from(s.routineExercises)
    .where(eq(s.routineExercises.routineId, routineId))
    .orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id));
  return rows.map((r) => r.exerciseId);
}

export async function listApiTokens(userId: number) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(cacheTags.tokens(userId));
  const db = await getDb();
  const rows = await db
    .select({
      id: s.apiTokens.id,
      name: s.apiTokens.name,
      scope: s.apiTokens.scope,
      createdAt: s.apiTokens.createdAt,
      lastUsedAt: s.apiTokens.lastUsedAt,
    })
    .from(s.apiTokens)
    .where(eq(s.apiTokens.userId, userId))
    .orderBy(asc(s.apiTokens.id));
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    scope: t.scope,
    createdAt: t.createdAt.toISOString(),
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
  }));
}
