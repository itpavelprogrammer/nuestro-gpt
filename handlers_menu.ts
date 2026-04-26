import type { Context } from "grammy";
import { getSession, updateSession } from "./db_sessions.js";
import { clearMessages } from "./db_messages.js";
import { mainMenuKeyboard } from "./keyboards_main.js";
import { modelsKeyboard } from "./keyboards_models.js";
import { imageSettingsKeyboard } from "./keyboards_image.js";
import { TEXT_MODELS, IMAGE_SIZES, IMAGE_QUALITIES } from "./config.js";

export async function handleCallback(ctx: Context) {
  if (!ctx.callbackQuery?.data || !ctx.chat) return;
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;

  // Никаких операций — просто закрыть индикатор
  if (data === "noop") {
    await ctx.answerCallbackQuery();
    return;
  }

  // ===== Открыть подменю =====
  if (data === "open:menu") {
    const s = getSession(chatId);
    await ctx.editMessageText("📋 *Главное меню*", {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(s.mode, s.text_model),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "open:models") {
    const s = getSession(chatId);
    await ctx.editMessageText("🤖 Выбери модель GPT:", {
      reply_markup: modelsKeyboard(s.text_model),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "open:image_settings") {
    const s = getSession(chatId);
    await ctx.editMessageText("📐 Настройки генерации картинок:", {
      reply_markup: imageSettingsKeyboard(s.image_size, s.image_quality),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // ===== Смена режима =====
  if (data === "mode:text") {
    updateSession(chatId, { mode: "text" });
    const s = getSession(chatId);
    await ctx.editMessageText(
      `💬 Режим *чата* включён. Модель: \`${s.text_model}\`.\nПросто пиши сообщения.`,
      {
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard(s.mode, s.text_model),
      }
    );
    await ctx.answerCallbackQuery("Режим: чат");
    return;
  }

  if (data === "mode:image") {
    updateSession(chatId, { mode: "image" });
    const s = getSession(chatId);
    await ctx.editMessageText(
      `🎨 Режим *генерации картинок* включён.\nРазмер: \`${s.image_size}\`, качество: \`${s.image_quality}\`.\nПришли описание картинки.`,
      {
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard(s.mode, s.text_model),
      }
    );
    await ctx.answerCallbackQuery("Режим: картинка");
    return;
  }

  // ===== Выбор модели =====
  if (data.startsWith("model:")) {
    const model = data.slice(6);
    if (!TEXT_MODELS.includes(model as (typeof TEXT_MODELS)[number])) {
      await ctx.answerCallbackQuery("Неизвестная модель");
      return;
    }
    updateSession(chatId, { text_model: model });
    await ctx.editMessageReplyMarkup({ reply_markup: modelsKeyboard(model) });
    await ctx.answerCallbackQuery(`Модель: ${model}`);
    return;
  }

  // ===== Выбор размера =====
  if (data.startsWith("size:")) {
    const size = data.slice(5);
    if (!IMAGE_SIZES.find((x) => x.value === size)) {
      await ctx.answerCallbackQuery("Неизвестный размер");
      return;
    }
    updateSession(chatId, { image_size: size });
    const s = getSession(chatId);
    await ctx.editMessageReplyMarkup({
      reply_markup: imageSettingsKeyboard(s.image_size, s.image_quality),
    });
    await ctx.answerCallbackQuery(`Размер: ${size}`);
    return;
  }

  // ===== Выбор качества =====
  if (data.startsWith("quality:")) {
    const quality = data.slice(8);
    if (!IMAGE_QUALITIES.find((x) => x.value === quality)) {
      await ctx.answerCallbackQuery("Неизвестное качество");
      return;
    }
    updateSession(chatId, { image_quality: quality });
    const s = getSession(chatId);
    await ctx.editMessageReplyMarkup({
      reply_markup: imageSettingsKeyboard(s.image_size, s.image_quality),
    });
    await ctx.answerCallbackQuery(`Качество: ${quality}`);
    return;
  }

  // ===== Сброс контекста =====
  if (data === "reset") {
    clearMessages(chatId);
    await ctx.answerCallbackQuery("История очищена ✅");
    return;
  }

  await ctx.answerCallbackQuery();
}
