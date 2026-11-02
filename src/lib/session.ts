import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "gp_session";
export const SESSION_DAYS = 60;

function secret() {
  const s = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me-dev-secret-change-me");
  if (!s) throw new Error("Falta SESSION_SECRET");
  return new TextEncoder().encode(s);
}

export async function signSession(userId: number) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}
