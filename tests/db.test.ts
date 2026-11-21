import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "../src/db/schema";

let client: PGlite;
let db: ReturnType<typeof drizzle<typeof s>>;
let userId: number;

beforeAll(async () => {
  client = new PGlite("memory://");
  db = drizzle(client, { schema: s });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const [u] = await db
    .insert(s.users)
    .values({ email: "test@example.com", name: "Test", passwordHash: "hash" })
    .returning({ id: s.users.id });
  userId = u.id;

  await db.insert(s.exercises).values([
    { id: "ex-bench", name: "Bench Press", nameEs: "Press banca", primaryMuscle: "chest", equipment: "barbell" },
    { id: "ex-row", name: "Barbell Row", nameEs: "Remo con barra", primaryMuscle: "middle_back", equipment: "barbell" },
    { id: "ex-squat", name: "Squat", nameEs: "Sentadilla", primaryMuscle: "quadriceps", equipment: "barbell" },
  ]);
});

afterAll(async () => {
  await client.close();
});

describe("db schema indexes & phase 3 queries (PGlite)", () => {
  it("aplica la migración con los índices nuevos", async () => {
    const res = await client.query<{ indexname: string }>(
      `select indexname from pg_indexes where schemaname = 'public'`,
    );
    const names = new Set(res.rows.map((r) => r.indexname));
    for (const expected of [
      "exercises_owner_idx",
      "routines_user_idx",
      "routine_exercises_routine_idx",
      "routine_sets_routine_exercise_idx",
      "plans_user_active_idx",
      "session_exercises_session_idx",
      "session_exercises_exercise_idx",
      "session_sets_session_exercise_idx",
    ]) {
      expect(names.has(expected)).toBe(true);
    }
  });

  it("batchea insert de routineExercises + routineSets y actualiza posiciones en una sola query CASE", async () => {
    const [r] = await db.insert(s.routines).values({ userId, name: "Push" }).returning({ id: s.routines.id });
    const items = [
      { exerciseId: "ex-bench", restSeconds: 90, notes: null, sets: [{ reps: 8, weightKg: 60, type: "normal" }, { reps: 8, weightKg: 65, type: "normal" }] },
      { exerciseId: "ex-row", restSeconds: 60, notes: "controlado", sets: [{ reps: 10, weightKg: 50, type: "normal" }] },
      { exerciseId: "ex-squat", restSeconds: 120, notes: null, sets: [] },
    ];
    const inserted = await db
      .insert(s.routineExercises)
      .values(items.map((it, i) => ({ routineId: r.id, exerciseId: it.exerciseId, position: i, restSeconds: it.restSeconds, notes: it.notes })))
      .returning({ id: s.routineExercises.id });
    expect(inserted).toHaveLength(3);

    const setRows = items.flatMap((it, idx) =>
      it.sets.map((x, k) => ({ routineExerciseId: inserted[idx].id, position: k, reps: x.reps, weightKg: x.weightKg, type: x.type })),
    );
    await db.insert(s.routineSets).values(setRows);

    // Consulta única leftJoin tipo getRoutine
    const joined = await db
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
      .where(and(eq(s.routines.id, r.id), eq(s.routines.userId, userId)))
      .orderBy(asc(s.routineExercises.position), asc(s.routineExercises.id), asc(s.routineSets.position), asc(s.routineSets.id));

    expect(joined.map((row) => row.ex?.exerciseId)).toEqual(["ex-bench", "ex-bench", "ex-row", "ex-squat"]);
    expect(joined[3].set).toBeNull();

    // Reordenamiento CASE en lote tipo moveRoutineExercise
    const reordered = [
      { id: inserted[1].id, pos: 0 },
      { id: inserted[0].id, pos: 1 },
    ];
    const cases = reordered.map((u) => sql`when ${u.id}::int then ${u.pos}::int`);
    await db
      .update(s.routineExercises)
      .set({ position: sql`case ${s.routineExercises.id} ${sql.join(cases, sql` `)} end` })
      .where(inArray(s.routineExercises.id, reordered.map((u) => u.id)));

    const afterMove = await db
      .select({ exerciseId: s.routineExercises.exerciseId, position: s.routineExercises.position })
      .from(s.routineExercises)
      .where(eq(s.routineExercises.routineId, r.id))
      .orderBy(asc(s.routineExercises.position));
    expect(afterMove).toEqual([
      { exerciseId: "ex-row", position: 0 },
      { exerciseId: "ex-bench", position: 1 },
      { exerciseId: "ex-squat", position: 2 },
    ]);
  });

  it("resuelve getActivePlan en una sola query con CTE", async () => {
    const [plan] = await db
      .insert(s.plans)
      .values({ userId, name: "Plan A", startDate: "2026-11-02", cycleWeeks: 2, isActive: true })
      .returning({ id: s.plans.id });
    await db.insert(s.planDays).values({ planId: plan.id, weekIndex: 0, weekday: 1, kind: "rest" });

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
        plan: { id: activePlan.id, name: activePlan.name, cycleWeeks: activePlan.cycleWeeks },
        day: s.planDays,
      })
      .from(activePlan)
      .leftJoin(s.planDays, eq(s.planDays.planId, activePlan.id));

    expect(rows).toHaveLength(1);
    expect(rows[0].plan.name).toBe("Plan A");
    expect(rows[0].day?.weekday).toBe(1);
  });

  it("obtiene lastSetsByExercise con DISTINCT ON + CTE excluyendo la sesión actual", async () => {
    const [s1] = await db
      .insert(s.workoutSessions)
      .values({ userId, name: "S1", date: "2026-11-10", startedAt: new Date("2026-11-10T10:00:00Z"), endedAt: new Date("2026-11-10T11:00:00Z") })
      .returning({ id: s.workoutSessions.id });
    const [s2] = await db
      .insert(s.workoutSessions)
      .values({ userId, name: "S2", date: "2026-11-12", startedAt: new Date("2026-11-12T10:00:00Z"), endedAt: new Date("2026-11-12T11:00:00Z") })
      .returning({ id: s.workoutSessions.id });
    const [s3] = await db
      .insert(s.workoutSessions)
      .values({ userId, name: "S3", date: "2026-11-15", startedAt: new Date("2026-11-15T10:00:00Z"), endedAt: new Date("2026-11-15T11:00:00Z") })
      .returning({ id: s.workoutSessions.id });

    const [se1, se2, se3] = await db
      .insert(s.sessionExercises)
      .values([
        { sessionId: s1.id, exerciseId: "ex-bench", position: 0 },
        { sessionId: s2.id, exerciseId: "ex-bench", position: 0 },
        { sessionId: s3.id, exerciseId: "ex-bench", position: 0 },
      ])
      .returning({ id: s.sessionExercises.id });

    await db.insert(s.sessionSets).values([
      { sessionExerciseId: se1.id, position: 0, reps: 10, weightKg: 50, completed: true },
      { sessionExerciseId: se2.id, position: 0, reps: 8, weightKg: 70, completed: true },
      { sessionExerciseId: se2.id, position: 1, reps: 8, weightKg: 75, completed: true },
      { sessionExerciseId: se3.id, position: 0, reps: 5, weightKg: 90, completed: true },
    ]);

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
            inArray(s.sessionExercises.exerciseId, ["ex-bench", "ex-row"]),
            isNotNull(s.workoutSessions.endedAt),
            ne(s.workoutSessions.id, s3.id),
          ),
        )
        .orderBy(asc(s.sessionExercises.exerciseId), desc(s.workoutSessions.date), desc(s.workoutSessions.startedAt), desc(s.sessionExercises.id)),
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

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => ({ date: r.date, reps: r.reps, weightKg: r.weightKg }))).toEqual([
      { date: "2026-11-12", reps: 8, weightKg: 70 },
      { date: "2026-11-12", reps: 8, weightKg: 75 },
    ]);
  });

  it("guarda y actualiza comentarios (notes) en sessionExercises", async () => {
    const [ws] = await db
      .insert(s.workoutSessions)
      .values({ userId, name: "Notas", date: "2026-11-21" })
      .returning({ id: s.workoutSessions.id });
    const [se] = await db
      .insert(s.sessionExercises)
      .values({ sessionId: ws.id, exerciseId: "ex-bench", position: 0, restSeconds: 60, notes: "Asiento en 4" })
      .returning();
    expect(se.notes).toBe("Asiento en 4");

    await db.update(s.sessionExercises).set({ notes: "Asiento en 5, codos 45°" }).where(eq(s.sessionExercises.id, se.id));
    const [updated] = await db.select().from(s.sessionExercises).where(eq(s.sessionExercises.id, se.id));
    expect(updated.notes).toBe("Asiento en 5, codos 45°");
  });
});
