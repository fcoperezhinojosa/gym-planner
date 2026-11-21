import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getDb, schema as s } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { isValidTimeZone } from "@/lib/reminders";

function isValidEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  const obj = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
    timeZone?: unknown;
  };
  const endpoint = obj?.endpoint;
  const p256dh = typeof obj?.keys?.p256dh === "string" ? obj.keys.p256dh.trim() : "";
  const auth = typeof obj?.keys?.auth === "string" ? obj.keys.auth.trim() : "";

  if (!isValidEndpoint(endpoint) || !p256dh || !auth || p256dh.length > 512 || auth.length > 256) {
    return NextResponse.json({ error: "Suscripción push no válida" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;
  const db = await getDb();
  const now = new Date();

  await db
    .insert(s.pushSubscriptions)
    .values({
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      userAgent,
      lastUsedAt: now,
    })
    .onConflictDoUpdate({
      target: s.pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh,
        auth,
        userAgent,
        lastUsedAt: now,
      },
    });

  const timeZone = isValidTimeZone(obj?.timeZone) ? obj.timeZone : undefined;
  await db
    .update(s.users)
    .set({
      reminderEnabled: true,
      ...(timeZone ? { reminderTimeZone: timeZone } : {}),
    })
    .where(eq(s.users.id, user.id));

  updateTag(cacheTags.userProfile(user.id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  const endpoint = (body as { endpoint?: unknown })?.endpoint;
  if (!isValidEndpoint(endpoint)) {
    return NextResponse.json({ error: "Endpoint no válido" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .delete(s.pushSubscriptions)
    .where(and(eq(s.pushSubscriptions.userId, user.id), eq(s.pushSubscriptions.endpoint, endpoint)));

  return NextResponse.json({ ok: true });
}
