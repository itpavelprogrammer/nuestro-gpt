import { InlineKeyboard } from "grammy";
import { IMAGE_SIZES, IMAGE_QUALITIES } from "../config.js";

export function imageSettingsKeyboard(currentSize: string, currentQuality: string) {
  const kb = new InlineKeyboard();

  kb.text("— Соотношение сторон —", "noop").row();
  for (const s of IMAGE_SIZES) {
    kb.text(currentSize === s.value ? `✅ ${s.label}` : s.label, `size:${s.value}`).row();
  }

  kb.text("— Качество —", "noop").row();
  for (const q of IMAGE_QUALITIES) {
    kb.text(currentQuality === q.value ? `✅ ${q.label}` : q.label, `quality:${q.value}`);
  }
  kb.row();
  kb.text("◀️ Назад в меню", "open:menu");
  return kb;
}
