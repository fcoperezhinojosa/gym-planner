import fs from "node:fs";
import path from "node:path";
import { and, eq, isNull, sql } from "drizzle-orm";
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

function loadTranslations(): Record<string, string> {
  const file = path.join(process.cwd(), "data", "exercises-es.json");
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>) : {};
}

/** Rellena name_es en los ejercicios del catálogo que aún no lo tienen (idempotente). */
export async function translateExercises(db: AnyDb) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.exercises)
    .where(and(isNull(schema.exercises.nameEs), isNull(schema.exercises.ownerId)));
  if (count === 0) return 0;
  const es = loadTranslations();
  let n = 0;
  for (const [id, name] of Object.entries(es)) {
    await db
      .update(schema.exercises)
      .set({ nameEs: name })
      .where(and(eq(schema.exercises.id, id), isNull(schema.exercises.nameEs)));
    n++;
  }
  return n;
}

/** Carga el catálogo de free-exercise-db (idempotente) y sus traducciones al español. */
export async function seedExercises(db: AnyDb) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.exercises);
  if (count > 0) {
    await translateExercises(db);
    return 0;
  }
  const es = loadTranslations();
  const file = path.join(process.cwd(), "data", "exercises.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RawExercise[];
  const rows = raw
    .filter((e) => e.primaryMuscles?.length)
    .map((e) => ({
      id: e.id,
      name: e.name,
      nameEs: es[e.id] ?? null,
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
