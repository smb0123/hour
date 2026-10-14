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

async function init() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT NOT NULL,
      owner_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS hours (
      user_id INTEGER NOT NULL,
      date    TEXT NOT NULL,
      hours   INTEGER NOT NULL,
      PRIMARY KEY (user_id, date)
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      key      TEXT PRIMARY KEY,
      count    INTEGER NOT NULL,
      first_at INTEGER NOT NULL
    );
  `);

  // 예전 버전(owner_id 없음)으로 만든 DB를 위한 마이그레이션
  const cols = await client.execute("PRAGMA table_info(users)");
  if (!cols.rows.some((r) => r.name === "owner_id")) {
    try {
      await client.execute("ALTER TABLE users ADD COLUMN owner_id INTEGER");
    } catch (e) {
      // 다른 인스턴스가 동시에 추가했다면 무시
      if (!String(e.message).includes("duplicate column")) throw e;
    }
  }
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_users_owner ON users(owner_id)"
  );

  // 주인 없는 기존 근무자는 가장 먼저 가입한 계정에 배정
  await client.execute(
    `UPDATE users
        SET owner_id = (SELECT MIN(id) FROM accounts)
      WHERE owner_id IS NULL
        AND EXISTS (SELECT 1 FROM accounts)`
  );
}

// 테이블이 없으면 만들고 클라이언트를 돌려준다.
export function db() {
  ready ??= init().catch((e) => {
    ready = undefined; // 실패하면 다음 요청에서 다시 시도
    throw e;
  });
  return ready.then(() => client);
}
