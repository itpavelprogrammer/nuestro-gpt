import { InlineKeyboard } from "grammy";
import { TEXT_MODELS } from "../config.js";

export function modelsKeyboard(current: string) {
  const kb = new InlineKeyboard();
  for (const m of TEXT_MODELS) {
    kb.text(current === m ? `✅ ${m}` : m, `model:${m}`).row();
  }
  kb.text("◀️ Назад в меню", "open:menu");
  return kb;
}
