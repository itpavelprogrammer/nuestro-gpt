import type { Context } from "grammy";
import { getSession } from "../db/sessions.js";
import { mainMenuKeyboard } from "../keyboards/main.js";

const WELCOME = `👋 Привет!

Я умею две вещи:
💬 *Чат с GPT* — отвечаю на вопросы, помню контекст
🎨 *Генерация картинок* — рисую через gpt-image-2

Выбери режим в меню ↓`;

export async function handleStart(ctx: Context) {
  if (!ctx.chat) return;
  const s = getSession(ctx.chat.id);
  await ctx.reply(WELCOME, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(s.mode, s.text_model),
  });
}

const HELP = `📖 *Команды*

/menu — главное меню
/model — выбрать модель GPT
/text — режим чата
/image — режим генерации картинок
/reset — очистить историю диалога
/help — эта подсказка`;

export async function handleHelp(ctx: Context) {
  await ctx.reply(HELP, { parse_mode: "Markdown" });
}
