import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

const notFound = () =>
  NextResponse.json({ error: "존재하지 않는 사용자입니다." }, { status: 404 });

export async function PUT(req, { params }) {
  const { user, res: denied } = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const wid = Number(id);
  if (!Number.isInteger(wid)) return notFound();

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
    sql: "UPDATE users SET name = ? WHERE id = ? AND owner_id = ?",
    args: [name, wid, user.id],
  });
  if (r.rowsAffected === 0) return notFound();
  return NextResponse.json({ id: wid, name });
}

export async function DELETE(_req, { params }) {
  const { user, res: denied } = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const wid = Number(id);
  if (!Number.isInteger(wid)) return notFound();

  const c = await db();
  // 내 근무자일 때만 근무 기록과 근무자를 함께 삭제
  const results = await c.batch(
    [
      {
        sql: `DELETE FROM hours WHERE user_id IN
                (SELECT id FROM users WHERE id = ? AND owner_id = ?)`,
        args: [wid, user.id],
      },
      {
        sql: "DELETE FROM users WHERE id = ? AND owner_id = ?",
        args: [wid, user.id],
      },
    ],
    "write"
  );
  if (results[1].rowsAffected === 0) return notFound();
  return NextResponse.json({ ok: true });
}
