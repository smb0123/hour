import { db } from "./db";

export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILS = 5;

export function clientIp(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

// 최근 WINDOW_MS 안에 실패가 MAX_FAILS번 이상이면 막는다.
export async function isBlocked(key) {
  const c = await db();
  const r = await c.execute({
    sql: "SELECT count, first_at FROM login_attempts WHERE key = ?",
    args: [key],
  });
  const row = r.rows[0];
  if (!row) return 0;
  const elapsed = Date.now() - Number(row.first_at);
  if (elapsed < WINDOW_MS && Number(row.count) >= MAX_FAILS) {
    return Math.ceil((WINDOW_MS - elapsed) / 60000); // 남은 분
  }
  return 0;
}

export async function recordFail(key) {
  const c = await db();
  const now = Date.now();
  await c.execute({
    sql: `INSERT INTO login_attempts (key, count, first_at) VALUES (?, 1, ?)
          ON CONFLICT(key) DO UPDATE SET
            count    = CASE WHEN ? - first_at >= ? THEN 1 ELSE count + 1 END,
            first_at = CASE WHEN ? - first_at >= ? THEN ? ELSE first_at END`,
    args: [key, now, now, WINDOW_MS, now, WINDOW_MS, now],
  });
}

export async function clearFails(key) {
  const c = await db();
  await c.execute({ sql: "DELETE FROM login_attempts WHERE key = ?", args: [key] });
}
