/**
 * Aplica migraciones y carga el catálogo de ejercicios en DATABASE_URL.
 *   DATABASE_URL=postgres://… npm run db:setup
 */
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../src/db/schema";
import { seedExercises } from "../src/db/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = await seedExercises(db as any);
  console.log(n ? `Ejercicios cargados: ${n}` : "Catálogo ya cargado");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
