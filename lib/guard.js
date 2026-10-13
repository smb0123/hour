import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, readToken } from "./session";

export async function getUser() {
  const store = await cookies();
  return readToken(store.get(COOKIE)?.value);
}

// API 라우트 맨 위에서 호출: 로그인 안 했으면 401 응답(res)을 돌려준다.
export async function requireUser() {
  const user = await getUser();
  if (user) return { user, res: null };
  return {
    user: null,
    res: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
  };
}
