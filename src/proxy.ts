import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/registro"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const uid = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!uid && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (uid && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|icon|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
