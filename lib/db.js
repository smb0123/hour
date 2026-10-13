import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";

if (process.env.VERCEL && url.startsWith("file:")) {
  throw new Error(
    "Vercel에서는 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 환경변수가 필요합니다."
  );
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

let ready;

// 테이블이 없으면 만들고 클라이언트를 돌려준다.
export function db() {
  ready ??= client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hours (
      user_id INTEGER NOT NULL,
      date    TEXT NOT NULL,
      hours   INTEGER NOT NULL,
      PRIMARY KEY (user_id, date)
    );
  `);
  return ready.then(() => client);
}
