import { db } from "./index.js";
import { config } from "../config.js";

export type Mode = "text" | "image";

export interface Session {
  chat_id: number;
  mode: Mode;
  text_model: string;
  image_size: string;
  image_quality: string;
  updated_at: number;
}

const getStmt = db.prepare<[number], Session>(
  "SELECT * FROM sessions WHERE chat_id = ?"
);

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
  SET mode = COALESCE(@mode, mode),
      text_model = COALESCE(@text_model, text_model),
      image_size = COALESCE(@image_size, image_size),
      image_quality = COALESCE(@image_quality, image_quality),
      updated_at = @updated_at
  WHERE chat_id = @chat_id
`);

export function updateSession(
  chatId: number,
  patch: Partial<Pick<Session, "mode" | "text_model" | "image_size" | "image_quality">>
) {
  getSession(chatId); // ensure row exists
  updateStmt.run({
    chat_id: chatId,
    mode: patch.mode ?? null,
    text_model: patch.text_model ?? null,
    image_size: patch.image_size ?? null,
    image_quality: patch.image_quality ?? null,
    updated_at: Date.now(),
  });
}
