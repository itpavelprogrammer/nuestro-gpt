import { db } from "./db_index.js";

export type Role = "system" | "user" | "assistant";

export interface DbMessage {
  id: number;
  chat_id: number;
  role: Role;
  content: string;
  created_at: number;
}

const insertStmt = db.prepare(`
  INSERT INTO messages (chat_id, role, content, created_at)
  VALUES (?, ?, ?, ?)
`);

export function addMessage(chatId: number, role: Role, content: string) {
  insertStmt.run(chatId, role, content, Date.now());
}

const recentStmt = db.prepare<[number, number], DbMessage>(`
  SELECT * FROM messages
  WHERE chat_id = ?
  ORDER BY id DESC
  LIMIT ?
`);

export function getRecentMessages(chatId: number, limit: number): DbMessage[] {
  const rows = recentStmt.all(chatId, limit);
  return rows.reverse();
}

const clearStmt = db.prepare("DELETE FROM messages WHERE chat_id = ?");
export function clearMessages(chatId: number) {
  clearStmt.run(chatId);
}
