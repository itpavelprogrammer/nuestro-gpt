import type { Context } from "grammy";
import { getSession } from "./db_sessions.js";
import { mainMenuKeyboard } from "./keyboards_main.js";
import { persistentKeyboard } from "./keyboards_persistent.js";

export async function handleStart(ctx: Context) {
  if (!ctx.chat) return;
  const s = getSession(ctx.chat.id);

  // Сначала показываем постоянную кнопку «☰ Меню» снизу
  await ctx.reply(
    "👋 Привет! Я бот с GPT.\n\nПросто пиши сообщения или присылай голосовые — я отвечу.\nВнизу есть кнопка ☰ Меню для настроек.",
    { reply_markup: persistentKeyboard }
  );

  // И сразу открываем inline-меню настроек
  await ctx.reply("📋 *Главное меню*", {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(s.text_model),
  });
}

export async function handleHelp(ctx: Context) {
  await ctx.reply(
    [
      "🤖 *Как пользоваться:*",
      "",
      "• Пиши текстом — отвечу через GPT",
      "• Присылай голосовые — расшифрую и отвечу",
      "• ☰ Меню снизу — настройки и выбор модели",
      "",
      "*Команды:*",
      "/menu — открыть меню",
      "/model — выбрать модель GPT",
      "/reset — очистить историю диалога",
      "/help — эта подсказка",
    ].join("\n"),
    { parse_mode: "Markdown" }
  );
}
