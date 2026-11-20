import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/registro"];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/boot") return NextResponse.next();
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic && searchParams.has("expired")) {
    const res = NextResponse.redirect(new URL(pathname, request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  const uid = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!uid && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (uid && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|icon|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
