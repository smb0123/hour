import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const { res: denied } = await requireUser();
  if (denied) return denied;
  const c = await db();
  const r = await c.execute("SELECT id, name FROM users ORDER BY id");
  return NextResponse.json(
    r.rows.map((x) => ({ id: Number(x.id), name: String(x.name) }))
  );
}

export async function POST(req) {
  const { res: denied } = await requireUser();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 20) {
    return NextResponse.json(
      { error: "이름은 1~20자로 입력하세요." },
      { status: 400 }
    );
  }
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO users (name) VALUES (?)",
    args: [name],
  });
  return NextResponse.json(
    { id: Number(r.lastInsertRowid), name },
    { status: 201 }
  );
}
