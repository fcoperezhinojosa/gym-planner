import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { seedExercises } from "./seed";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __gymDb?: Promise<DB> };

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Producción: Postgres (p. ej. Supabase). Migraciones con `npm run db:setup`.
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { prepare: false, max: 5 });
    return drizzle(client, { schema }) as unknown as DB;
  }
  // Desarrollo: Postgres embebido (PGlite) en ./.pglite, se migra y siembra solo.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".pglite");
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seedExercises(db as unknown as DB);
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__gymDb) {
    g.__gymDb = connect().catch((err) => {
      g.__gymDb = undefined;
      throw err;
    });
  }
  return g.__gymDb;
}

export { schema };
