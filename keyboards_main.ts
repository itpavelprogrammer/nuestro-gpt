import { InlineKeyboard } from "grammy";

export function mainMenuKeyboard(currentMode: "text" | "image", currentModel: string) {
  return new InlineKeyboard()
    .text(
      currentMode === "text" ? "✅ 💬 Текст (GPT)" : "💬 Текст (GPT)",
      "mode:text"
    )
    .text(
      currentMode === "image" ? "✅ 🎨 Картинка" : "🎨 Картинка",
      "mode:image"
    )
    .row()
    .text(`⚙️ Модель: ${currentModel}`, "open:models")
    .text("📐 Настройки картинки", "open:image_settings")
    .row()
    .text("🧹 Сбросить контекст", "reset");
}
