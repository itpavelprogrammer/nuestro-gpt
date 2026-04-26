import { db } from "./db_index.js";
import { config } from "./config.js";

export interface Session {
  chat_id: number;
  text_model: string;
  updated_at: number;
}

// SELECT только нужных полей — игнорируем устаревшие колонки старой схемы
const getStmt = db.prepare<[number], Session>(
  "SELECT chat_id, text_model, updated_at FROM sessions WHERE chat_id = ?"
);

// INSERT совместим со старой схемой: указываем mode/size/quality дефолтами,
// чтобы NOT NULL колонки (если они есть) не упали.
const insertStmt = db.prepare(`
  INSERT INTO sessions (chat_id, mode, text_model, image_size, image_quality, updated_at)
  VALUES (?, 'text', ?, '1024x1024', 'medium', ?)
`);

export function getSession(chatId: number): Session {
  let s = getStmt.get(chatId);
  if (!s) {
    insertStmt.run(chatId, config.DEFAULT_TEXT_MODEL, Date.now());
    s = getStmt.get(chatId)!;
  }
  return s;
}

const updateStmt = db.prepare(`
  UPDATE sessions
  SET text_model = COALESCE(@text_model, text_model),
      updated_at = @updated_at
  WHERE chat_id = @chat_id
`);

export function updateSession(
  chatId: number,
  patch: Partial<Pick<Session, "text_model">>
) {
  getSession(chatId); // ensure row exists
  updateStmt.run({
    chat_id: chatId,
    text_model: patch.text_model ?? null,
    updated_at: Date.now(),
  });
}
