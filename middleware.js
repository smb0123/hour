import { NextResponse } from "next/server";
import { COOKIE, readToken } from "./lib/session";

const PUBLIC_PAGES = ["/login", "/signup"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 로그인/가입 API는 누구나 호출 가능 (내부에서 자체 검증)
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const user = await readToken(req.cookies.get(COOKIE)?.value);

  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PAGES.includes(pathname);
  if (!user && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  if (user && isPublic) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
