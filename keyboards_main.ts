import { InlineKeyboard } from "grammy";

export function mainMenuKeyboard(currentModel: string) {
  return new InlineKeyboard()
    .text(`⚙️ Модель: ${currentModel}`, "open:models")
    .row()
    .text("🧹 Сбросить контекст", "reset");
}
