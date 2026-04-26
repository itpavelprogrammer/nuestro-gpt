import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";
import { logger } from "./utils_logger.js";

mkdirSync(dirname(config.DB_PATH), { recursive: true });

export const db = new Database(config.DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username    TEXT,
  first_name  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'blocked'
  created_at  INTEGER NOT NULL,
  decided_at  INTEGER,
  decided_by  INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  chat_id        INTEGER PRIMARY KEY,
  mode           TEXT NOT NULL DEFAULT 'text',
  text_model     TEXT NOT NULL DEFAULT 'gpt-5-mini',
  image_size     TEXT NOT NULL DEFAULT '1024x1024',
  image_quality  TEXT NOT NULL DEFAULT 'medium',
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    INTEGER NOT NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, id);

CREATE TABLE IF NOT EXISTS image_jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     INTEGER NOT NULL,
  prompt      TEXT NOT NULL,
  size        TEXT NOT NULL,
  quality     TEXT NOT NULL,
  status      TEXT NOT NULL,
  error       TEXT,
  created_at  INTEGER NOT NULL
);
`;

db.exec(SCHEMA);

// Миграция для существующих БД: добавляем колонки если их нет
function ensureColumn(table: string, column: string, ddl: string) {
  const cols = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;
  if (!cols.find((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    logger.info({ table, column }, "DB migration: added column");
  }
}
ensureColumn("users", "status", "status TEXT NOT NULL DEFAULT 'pending'");
ensureColumn("users", "decided_at", "decided_at INTEGER");
ensureColumn("users", "decided_by", "decided_by INTEGER");

// Авто-одобрение админов
const approveAdmins = db.prepare(
  `INSERT OR IGNORE INTO users (telegram_id, status, created_at, decided_at)
   VALUES (?, 'approved', ?, ?)`
);
const promoteAdmins = db.prepare(
  `UPDATE users SET status = 'approved', decided_at = ? WHERE telegram_id = ? AND status != 'approved'`
);
const nowMs = Date.now();
for (const id of config.ADMIN_IDS) {
  approveAdmins.run(id, nowMs, nowMs);
  promoteAdmins.run(nowMs, id);
}

logger.info({ path: config.DB_PATH, admins: config.ADMIN_IDS }, "SQLite ready");

export function closeDb() {
  db.close();
}
