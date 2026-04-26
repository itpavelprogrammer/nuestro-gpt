import type { Context } from "grammy";
import { getSession, updateSession } from "./db_sessions.js";
import { clearMessages } from "./db_messages.js";
import { mainMenuKeyboard } from "./keyboards_main.js";
import { modelsKeyboard } from "./keyboards_models.js";
import { TEXT_MODELS } from "./config.js";

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.chat) return;
  const chatId = ctx.chat.id;

  if (data === "noop") {
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "open:menu") {
    const s = getSession(chatId);
    await ctx.editMessageText("📋 *Главное меню*", {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(s.text_model),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "open:models") {
    const s = getSession(chatId);
    await ctx.editMessageText("🤖 Выбери модель:", {
      reply_markup: modelsKeyboard(s.text_model),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (data.startsWith("model:")) {
    const model = data.slice("model:".length);
    if (!(TEXT_MODELS as readonly string[]).includes(model)) {
      await ctx.answerCallbackQuery({ text: "Неизвестная модель" });
      return;
    }
    updateSession(chatId, { text_model: model });
    await ctx.editMessageText(`✅ Модель установлена: ${model}`, {
      reply_markup: modelsKeyboard(model),
    });
    await ctx.answerCallbackQuery({ text: `Выбрано: ${model}` });
    return;
  }

  if (data === "reset") {
    clearMessages(chatId);
    await ctx.answerCallbackQuery({ text: "История очищена 🧹" });
    return;
  }

  await ctx.answerCallbackQuery();
}
