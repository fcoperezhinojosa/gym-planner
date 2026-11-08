import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  bodyWeightKg: number;
  sex: string | null;
  birthYear: number | null;
  heightCm: number | null;
  dailyIntakeKcal: number | null;
};

async function getUserById(uid: number): Promise<CurrentUser | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`user-profile:${uid}`);
  const db = await getDb();
  const [u] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      bodyWeightKg: schema.users.bodyWeightKg,
      sex: schema.users.sex,
      birthYear: schema.users.birthYear,
      heightCm: schema.users.heightCm,
      dailyIntakeKcal: schema.users.dailyIntakeKcal,
    })
    .from(schema.users)
    .where(eq(schema.users.id, uid));
  return u ?? null;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const uid = await verifySession(token);
  if (!uid) return null;
  return getUserById(uid);
});

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function startSession(userId: number) {
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
