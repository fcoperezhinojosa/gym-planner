import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

export type TokenScope = "read" | "edit";
export type ApiPrincipal = { user: { id: number; name: string; email: string; bodyWeightKg: number }; scope: TokenScope };

const PREFIX = "gp_";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Devuelve el token en claro (solo se muestra una vez) y su hash. */
export function generateToken() {
  const token = PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

/** Identifica al usuario a partir de `Authorization: Bearer gp_…`. */
export async function authenticate(request: Request): Promise<ApiPrincipal | null> {
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m || !m[1].startsWith(PREFIX)) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      tokenId: s.apiTokens.id,
      scope: s.apiTokens.scope,
      id: s.users.id,
      name: s.users.name,
      email: s.users.email,
      bodyWeightKg: s.users.bodyWeightKg,
    })
    .from(s.apiTokens)
    .innerJoin(s.users, eq(s.users.id, s.apiTokens.userId))
    .where(eq(s.apiTokens.tokenHash, hashToken(m[1])));
  if (!row) return null;
  // Sin esperar: no bloquea la respuesta si falla.
  void db.update(s.apiTokens).set({ lastUsedAt: new Date() }).where(eq(s.apiTokens.id, row.tokenId)).catch(() => {});
  return {
    user: { id: row.id, name: row.name, email: row.email, bodyWeightKg: row.bodyWeightKg },
    scope: row.scope === "read" ? "read" : "edit",
  };
}
