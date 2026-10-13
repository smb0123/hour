import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 20) {
    return NextResponse.json(
      { error: "이름은 1~20자로 입력하세요." },
      { status: 400 }
    );
  }
  const c = await db();
  await c.execute({
    sql: "UPDATE users SET name = ? WHERE id = ?",
    args: [name, Number(id)],
  });
  return NextResponse.json({ id: Number(id), name });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  const c = await db();
  await c.batch(
    [
      { sql: "DELETE FROM hours WHERE user_id = ?", args: [Number(id)] },
      { sql: "DELETE FROM users WHERE id = ?", args: [Number(id)] },
    ],
    "write"
  );
  return NextResponse.json({ ok: true });
}
