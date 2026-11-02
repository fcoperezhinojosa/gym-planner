import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

type AnyDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Carga el catálogo de free-exercise-db (idempotente). */
export async function seedExercises(db: AnyDb) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.exercises);
  if (count > 0) return 0;
  const file = path.join(process.cwd(), "data", "exercises.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RawExercise[];
  const rows = raw
    .filter((e) => e.primaryMuscles?.length)
    .map((e) => ({
      id: e.id,
      name: e.name,
      primaryMuscle: e.primaryMuscles[0],
      secondaryMuscles: [...e.primaryMuscles.slice(1), ...(e.secondaryMuscles ?? [])],
      equipment: e.equipment ?? "other",
      category: e.category ?? "strength",
      level: e.level,
      mechanic: e.mechanic,
      force: e.force,
      instructions: e.instructions ?? [],
      images: e.images ?? [],
    }));
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(schema.exercises).values(rows.slice(i, i + 200)).onConflictDoNothing();
  }
  return rows.length;
}
