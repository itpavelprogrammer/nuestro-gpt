import { db } from "./db_index.js";

export type UserStatus = "pending" | "approved" | "blocked";

export interface DbUser {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  status: UserStatus;
  created_at: number;
  decided_at: number | null;
  decided_by: number | null;
}

const upsertStmt = db.prepare(`
  INSERT INTO users (telegram_id, username, first_name, status, created_at)
  VALUES (@telegram_id, @username, @first_name, 'pending', @created_at)
  ON CONFLICT(telegram_id) DO UPDATE SET
    username = excluded.username,
    first_name = excluded.first_name
`);

/** Регистрирует пользователя, если его нет. Не меняет статус существующим. */
export function upsertUser(opts: {
  telegramId: number;
  username?: string;
  firstName?: string;
}) {
  upsertStmt.run({
    telegram_id: opts.telegramId,
    username: opts.username ?? null,
    first_name: opts.firstName ?? null,
    created_at: Date.now(),
  });
}

const getStmt = db.prepare<[number], DbUser>(
  "SELECT * FROM users WHERE telegram_id = ?"
);
export function getUser(telegramId: number): DbUser | undefined {
  return getStmt.get(telegramId);
}

const setStatusStmt = db.prepare(
  `UPDATE users SET status = ?, decided_at = ?, decided_by = ? WHERE telegram_id = ?`
);
export function setUserStatus(
  telegramId: number,
  status: UserStatus,
  decidedBy: number
) {
  setStatusStmt.run(status, Date.now(), decidedBy, telegramId);
}

const listStmt = db.prepare<[], DbUser>(
  `SELECT * FROM users ORDER BY
     CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
     created_at DESC
   LIMIT 100`
);
export function listUsers(): DbUser[] {
  return listStmt.all();
}

const countByStatusStmt = db.prepare<[UserStatus], { c: number }>(
  `SELECT COUNT(*) as c FROM users WHERE status = ?`
);
export function countByStatus(status: UserStatus): number {
  return countByStatusStmt.get(status)?.c ?? 0;
}
