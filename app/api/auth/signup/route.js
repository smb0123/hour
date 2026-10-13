import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, safeEqual } from "@/lib/password";
import { COOKIE, configError, cookieOptions, createToken } from "@/lib/session";
import { clearFails, clientIp, isBlocked, recordFail } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req) {
  const cfg = configError();
  if (cfg) return fail(cfg, 500);

  const expected = process.env.SIGNUP_CODE;
  if (!expected) {
    return fail("회원가입이 닫혀 있습니다. 관리자에게 문의하세요.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const code = String(body.code ?? "");

  const key = `signup|${clientIp(req)}`;
  const wait = await isBlocked(key);
  if (wait) return fail(`시도 횟수를 초과했습니다. ${wait}분 후 다시 시도하세요.`, 429);

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return fail("아이디는 영문 소문자, 숫자, _ 로 3~20자여야 합니다.");
  }
  if (password.length < 8 || password.length > 128) {
    return fail("비밀번호는 8자 이상 128자 이하여야 합니다.");
  }

  if (!safeEqual(code, expected)) {
    await recordFail(key);
    return fail("가입 코드가 올바르지 않습니다.", 403);
  }

  const c = await db();
  const exists = await c.execute({
    sql: "SELECT id FROM accounts WHERE username = ?",
    args: [username],
  });
  if (exists.rows.length > 0) return fail("이미 사용 중인 아이디입니다.", 409);

  let id;
  try {
    const r = await c.execute({
      sql: "INSERT INTO accounts (username, password_hash, created_at) VALUES (?, ?, ?)",
      args: [username, await hashPassword(password), Date.now()],
    });
    id = Number(r.lastInsertRowid);
  } catch {
    return fail("이미 사용 중인 아이디입니다.", 409);
  }

  await clearFails(key);
  const res = NextResponse.json({ username }, { status: 201 });
  res.cookies.set(COOKIE, await createToken({ id, username }), cookieOptions);
  return res;
}
