import { NextResponse } from "next/server";
import { getUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json({ username: user.username });
}
