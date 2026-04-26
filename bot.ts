import { Bot } from "grammy";
import { config, isAdmin } from "./config.js";
import { logger } from "./utils_logger.js";
import { getSession, updateSession } from "./db_sessions.js";
import { mainMenuKeyboard } from "./keyboards_main.js";
import { modelsKeyboard } from "./keyboards_models.js";
import { handleStart, handleHelp } from "./handlers_start.js";
import { handleCallback } from "./handlers_menu.js";
import { handleText, handleReset } from "./handlers_text.js";
import {
  handleAdminCallback,
  handleUsersList,
  handleApproveCmd,
  handleBlockCmd,
} from "./handlers_admin.js";
import { accessGuard } from "./middleware_access.js";

export function createBot() {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  // ===== Админ-кнопки на заявках обрабатываем ДО access guard,
  // потому что они доступны только админам и не должны блокироваться
  // (хотя админы всё равно проходят guard, это ускоряет ответ).
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith("admin:") && ctx.from && isAdmin(ctx.from.id)) {
      await handleAdminCallback(ctx);
      return; // не пропускаем дальше
    }
    return next();
  });

  // ===== Глобальный middleware доступа =====
  bot.use(accessGuard);

  // ===== Команды бота (показываются в Telegram-меню) =====
  bot.api
    .setMyCommands([
      { command: "start", description: "Главное меню" },
      { command: "menu", description: "Показать меню" },
      { command: "model", description: "Выбрать модель GPT" },
      { command: "text", description: "Режим чата" },
      { command: "image", description: "Режим генерации картинок" },
      { command: "reset", description: "Очистить историю диалога" },
      { command: "help", description: "Подсказка" },
    ])
    .catch((e) => logger.warn({ err: e }, "setMyCommands failed"));

  // ===== Админ-команды =====
  bot.command("users", handleUsersList);
  bot.command("approve", handleApproveCmd);
  bot.command("block", handleBlockCmd);

  // ===== Команды пользователя =====
  bot.command("start", handleStart);
  bot.command("menu", handleStart);
  bot.command("help", handleHelp);
  bot.command("reset", handleReset);

  bot.command("model", async (ctx) => {
    if (!ctx.chat) return;
    const s = getSession(ctx.chat.id);
    await ctx.reply("🤖 Выбери модель:", { reply_markup: modelsKeyboard(s.text_model) });
  });

  bot.command("text", async (ctx) => {
    if (!ctx.chat) return;
    updateSession(ctx.chat.id, { mode: "text" });
    const s = getSession(ctx.chat.id);
    await ctx.reply(`💬 Режим чата (${s.text_model}). Пиши сообщение.`, {
      reply_markup: mainMenuKeyboard(s.mode, s.text_model),
    });
  });

  bot.command("image", async (ctx) => {
    if (!ctx.chat) return;
    updateSession(ctx.chat.id, { mode: "image" });
    const s = getSession(ctx.chat.id);
    await ctx.reply(
      `🎨 Режим картинок (${s.image_size}, ${s.image_quality}). Пришли описание.`,
      { reply_markup: mainMenuKeyboard(s.mode, s.text_model) }
    );
  });

  // Inline-кнопки (не админские — они уже обработаны выше)
  bot.on("callback_query:data", handleCallback);

  // Любое текстовое сообщение
  bot.on("message:text", handleText);

  // Не-текстовые сообщения
  bot.on("message", async (ctx) => {
    await ctx.reply("Я понимаю только текст. Отправь сообщение или /menu.");
  });

  // Глобальный обработчик ошибок
  bot.catch((err) => {
    logger.error({ err: err.error, update: err.ctx.update }, "Bot error");
  });

  return bot;
}
