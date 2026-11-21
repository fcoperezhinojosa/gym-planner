import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listExercisesLite } from "@/lib/data";

const CACHE_CONTROL = "private, max-age=0, must-revalidate";

/**
 * Devuelve el catálogo ligero de ejercicios (base + propios del usuario) con ETag
 * para que el navegador lo cachee y revalide sin retransferir ~160 KB si no ha cambiado.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const exercises = await listExercisesLite(user.id);
  const body = JSON.stringify(exercises);
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": CACHE_CONTROL,
        Vary: "Cookie",
      },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ETag: etag,
      "Cache-Control": CACHE_CONTROL,
      Vary: "Cookie",
    },
  });
}
