// 세션(JWT) 유틸. middleware(Edge)에서도 쓰므로 node 전용 모듈을 import하면 안 됩니다.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7일

export function configError() {
  const s = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s.length < 16)) {
    return "서버 설정 오류: AUTH_SECRET 환경변수(16자 이상)가 필요합니다.";
  }
  return null;
}

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET 환경변수가 필요합니다.");
    }
    return new TextEncoder().encode("dev-only-secret-change-me-in-env-local");
  }
  return new TextEncoder().encode(s);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export async function createToken(account) {
  return new SignJWT({ username: account.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(account.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

export async function readToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { id: Number(payload.sub), username: String(payload.username) };
  } catch {
    return null;
  }
}
