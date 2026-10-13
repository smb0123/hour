import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LIMIT, isDate, dayCount, worstAround } from "@/lib/hours";

export const dynamic = "force-dynamic";
const MAX_DAYS = 93;

const bad = (error) => NextResponse.json({ error }, { status: 400 });
const md = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

// GET /api/hours?from=YYYY-MM-DD&to=YYYY-MM-DD  ->  { [userId]: { [date]: hours } }
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!isDate(from) || !isDate(to) || from > to) {
    return bad("기간이 올바르지 않습니다.");
  }
  if (dayCount(from, to) > MAX_DAYS) {
    return bad(`기간은 최대 ${MAX_DAYS}일까지 선택할 수 있습니다.`);
  }

  const c = await db();
  const r = await c.execute({
    sql: "SELECT user_id, date, hours FROM hours WHERE date BETWEEN ? AND ?",
    args: [from, to],
  });
  const out = {};
  for (const row of r.rows) {
    const uid = String(row.user_id);
    (out[uid] ??= {})[String(row.date)] = Number(row.hours);
  }
  return NextResponse.json(out);
}

// PUT { userId, date, hours }
export async function PUT(req) {
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId);
  const { date } = body;
  const hours = body.hours;

  if (!Number.isInteger(userId) || !isDate(date)) return bad("잘못된 요청입니다.");
  if (!Number.isInteger(hours) || hours < 0) {
    return bad("근무시간은 0 이상의 정수여야 합니다.");
  }
  if (hours > 24) return bad("하루 근무시간은 24시간을 넘을 수 없습니다.");

  const c = await db();
  const u = await c.execute({
    sql: "SELECT name FROM users WHERE id = ?",
    args: [userId],
  });
  if (u.rows.length === 0) return bad("존재하지 않는 사용자입니다.");

  // 서버에서 52시간 검증 (그 사람의 전체 기록으로 계산)
  if (hours > 0) {
    const all = await c.execute({
      sql: "SELECT date, hours FROM hours WHERE user_id = ?",
      args: [userId],
    });
    const map = {};
    for (const row of all.rows) map[String(row.date)] = Number(row.hours);
    map[date] = hours;

    const w = worstAround(map, date);
    if (w.sum > LIMIT) {
      return bad(
        `⚠ 주 ${LIMIT}시간 초과\n\n${u.rows[0].name}님 ${md(w.start)}~${md(w.end)} 근무시간 합계가 ${w.sum}시간입니다.\n(${LIMIT}시간 이하만 입력할 수 있습니다.)`
      );
    }
  }

  if (hours === 0) {
    await c.execute({
      sql: "DELETE FROM hours WHERE user_id = ? AND date = ?",
      args: [userId, date],
    });
  } else {
    await c.execute({
      sql: `INSERT INTO hours (user_id, date, hours) VALUES (?, ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET hours = excluded.hours`,
      args: [userId, date, hours],
    });
  }
  return NextResponse.json({ ok: true });
}
