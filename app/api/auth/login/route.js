import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { COOKIE, configError, cookieOptions, createToken } from "@/lib/session";
import { clearFails, clientIp, isBlocked, recordFail } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

let dummyHash;

export async function POST(req) {
  const cfg = configError();
  if (cfg) return fail(cfg, 500);

  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!username || !password || password.length > 128) {
    return fail("아이디와 비밀번호를 입력하세요.");
  }

  const key = `login|${clientIp(req)}|${username}`;
  const wait = await isBlocked(key);
  if (wait) {
    return fail(`로그인 실패가 너무 많습니다. ${wait}분 후 다시 시도하세요.`, 429);
  }

  const c = await db();
  const r = await c.execute({
    sql: "SELECT id, username, password_hash FROM accounts WHERE username = ?",
    args: [username],
  });
  const row = r.rows[0];

  // 없는 아이디여도 같은 시간이 걸리도록 더미 해시와 비교
  dummyHash ??= await hashPassword("dummy-password");
  const ok = await verifyPassword(password, row ? String(row.password_hash) : dummyHash);

  if (!row || !ok) {
    await recordFail(key);
    return fail("아이디 또는 비밀번호가 올바르지 않습니다.", 401);
  }

  await clearFails(key);
  const res = NextResponse.json({ username: String(row.username) });
  res.cookies.set(
    COOKIE,
    await createToken({ id: Number(row.id), username: String(row.username) }),
    cookieOptions
  );
  return res;
}
