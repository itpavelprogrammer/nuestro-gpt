import type { Context } from "grammy";
import { getSession } from "./db_sessions.js";
import { addMessage, getRecentMessages, clearMessages } from "./db_messages.js";
import { chatWithGpt } from "./openai_chat.js";
import { transcribeTelegramVoice } from "./openai_voice.js";
import { config } from "./config.js";
import { logger } from "./utils_logger.js";
import { splitMessage } from "./utils_format.js";
import { mainMenuKeyboard } from "./keyboards_main.js";
import { MENU_BUTTON_TEXT } from "./keyboards_persistent.js";

// Защита от двойных запросов от одного юзера
const busy = new Set<number>();

export async function handleText(ctx: Context) {
  if (!ctx.chat || !ctx.message?.text) return;
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();

  // Игнор команд (они обрабатываются bot.command)
  if (text.startsWith("/")) return;

  // Постоянная кнопка «☰ Меню» — открываем настройки в любой момент
  if (text === MENU_BUTTON_TEXT) {
    const s = getSession(chatId);
    await ctx.reply("📋 *Главное меню*", {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(s.text_model),
    });
    return;
  }

  await processUserMessage(ctx, chatId, text);
}

/**
 * Обработка голосового / аудио сообщения: скачиваем, расшифровываем,
 * показываем расшифровку и отправляем в GPT как обычный текст.
 */
export async function handleVoice(ctx: Context) {
  if (!ctx.chat) return;
  const chatId = ctx.chat.id;

  const voice = ctx.message?.voice ?? ctx.message?.audio;
  if (!voice) return;

  if (busy.has(chatId)) {
    await ctx.reply("⏳ Подожди, ещё обрабатываю предыдущий запрос…");
    return;
  }
  busy.add(chatId);

  try {
    await ctx.replyWithChatAction("typing");

    // Получаем прямой URL файла через Telegram Bot API
    const file = await ctx.api.getFile(voice.file_id);
    if (!file.file_path) {
      await ctx.reply("❌ Не удалось получить файл голосового сообщения.");
      return;
    }
    const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    let transcript: string;
    try {
      transcript = await transcribeTelegramVoice(fileUrl, "voice.oga");
    } catch (err) {
      handleOpenAiError(ctx, err, "расшифровке голосового");
      return;
    }

    if (!transcript) {
      await ctx.reply("🤔 Не удалось распознать речь. Попробуй ещё раз.");
      return;
    }

    // Показываем пользователю распознанный текст
    await ctx.reply(`🎙 _Распознано:_\n${transcript}`, { parse_mode: "Markdown" });

    // Дальше — обычный путь как для текстового сообщения
    await processUserMessage(ctx, chatId, transcript);
  } finally {
    busy.delete(chatId);
  }
}

async function processUserMessage(ctx: Context, chatId: number, text: string) {
  if (busy.has(chatId)) {
    await ctx.reply("⏳ Подожди, ещё обрабатываю предыдущий запрос…");
    return;
  }
  busy.add(chatId);

  try {
    const session = getSession(chatId);
    await handleChatMessage(ctx, chatId, text, session.text_model);
  } finally {
    busy.delete(chatId);
  }
}

async function handleChatMessage(
  ctx: Context,
  chatId: number,
  text: string,
  model: string
) {
  await ctx.replyWithChatAction("typing");
  const typing = setInterval(() => {
    ctx.replyWithChatAction("typing").catch(() => {});
  }, 4000);

  try {
    const history = getRecentMessages(chatId, config.HISTORY_LIMIT);
    const result = await chatWithGpt(model, history, text);

    addMessage(chatId, "user", text);
    addMessage(chatId, "assistant", result.content);

    for (const chunk of splitMessage(result.content)) {
      await ctx.reply(chunk);
    }
  } catch (err) {
    handleOpenAiError(ctx, err, "чате");
  } finally {
    clearInterval(typing);
  }
}

function handleOpenAiError(ctx: Context, err: unknown, where: string) {
  logger.error({ err }, `OpenAI error in ${where}`);
  const e = err as { status?: number; code?: string; message?: string };

  if (e?.status === 429) {
    ctx.reply("⏱ OpenAI говорит «слишком много запросов». Подожди немного и попробуй ещё раз.");
    return;
  }
  if (e?.code === "insufficient_quota" || e?.status === 402) {
    ctx.reply("💳 Закончились средства на OpenAI-аккаунте. Пополни баланс на platform.openai.com.");
    return;
  }
  if (e?.code === "content_policy_violation" || e?.code === "moderation_blocked") {
    ctx.reply("🚫 Запрос отклонён модерацией OpenAI. Попробуй переформулировать.");
    return;
  }
  ctx.reply(`❌ Ошибка в ${where}: ${e?.message ?? "неизвестная ошибка"}`);
}

export async function handleReset(ctx: Context) {
  if (!ctx.chat) return;
  clearMessages(ctx.chat.id);
  await ctx.reply("🧹 История диалога очищена.");
}
