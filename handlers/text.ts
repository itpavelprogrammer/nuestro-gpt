import type { Context } from "grammy";
import { InputFile } from "grammy";
import { getSession } from "../db/sessions.js";
import { addMessage, getRecentMessages, clearMessages } from "../db/messages.js";
import { chatWithGpt } from "../openai/chat.js";
import { generateImage } from "../openai/image.js";
import { db } from "../db/index.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { splitMessage } from "../utils/format.js";

// Защита от двойных запросов от одного юзера
const busy = new Set<number>();

const insertImageJob = db.prepare(`
  INSERT INTO image_jobs (chat_id, prompt, size, quality, status, error, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export async function handleText(ctx: Context) {
  if (!ctx.chat || !ctx.message?.text) return;
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();

  // Игнор команд (они обрабатываются bot.command)
  if (text.startsWith("/")) return;

  if (busy.has(chatId)) {
    await ctx.reply("⏳ Подожди, ещё обрабатываю предыдущий запрос…");
    return;
  }
  busy.add(chatId);

  try {
    const session = getSession(chatId);

    if (session.mode === "image") {
      await handleImagePrompt(ctx, chatId, text, session.image_size, session.image_quality);
    } else {
      await handleChatMessage(ctx, chatId, text, session.text_model);
    }
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

async function handleImagePrompt(
  ctx: Context,
  chatId: number,
  prompt: string,
  size: string,
  quality: string
) {
  await ctx.replyWithChatAction("upload_photo");
  const uploading = setInterval(() => {
    ctx.replyWithChatAction("upload_photo").catch(() => {});
  }, 4000);

  try {
    const result = await generateImage({ prompt, size, quality });
    insertImageJob.run(chatId, prompt, size, quality, "ok", null, Date.now());

    await ctx.replyWithPhoto(new InputFile(result.buffer, "image.png"), {
      caption: `🎨 ${result.model} · ${size} · ${quality}\n\n${prompt.slice(0, 900)}`,
    });
  } catch (err) {
    insertImageJob.run(
      chatId,
      prompt,
      size,
      quality,
      "error",
      err instanceof Error ? err.message : String(err),
      Date.now()
    );
    handleOpenAiError(ctx, err, "генерации картинки");
  } finally {
    clearInterval(uploading);
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
  ctx.reply(`❌ Ошибка: ${e?.message ?? "неизвестная ошибка"}`);
}

export async function handleReset(ctx: Context) {
  if (!ctx.chat) return;
  clearMessages(ctx.chat.id);
  await ctx.reply("🧹 История диалога очищена.");
}
