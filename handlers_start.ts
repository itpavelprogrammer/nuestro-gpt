import type { Context } from "grammy";
import { getSession } from "./db_sessions.js";
import { mainMenuKeyboard } from "./keyboards_main.js";
import { persistentKeyboard } from "./keyboards_persistent.js";

const WELCOME = `👋 Привет!

Я умею две вещи:
💬 *Чат с GPT* — отвечаю на вопросы, помню контекст
🎨 *Генерация картинок* — рисую через gpt-image-2

Кнопка *☰ Меню* внизу всегда открывает настройки.
Выбери режим в меню ↓`;

export async function handleStart(ctx: Context) {
  if (!ctx.chat) return;
  const s = getSession(ctx.chat.id);
  // Сначала прикрепляем постоянную клавиатуру отдельным сообщением,
  // чтобы она появилась внизу и осталась там всегда.
  await ctx.reply("Готов к работе. Кнопка ☰ Меню всегда снизу.", {
    reply_markup: persistentKeyboard,
  });
  await ctx.reply(WELCOME, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(s.mode, s.text_model),
  });
}

const HELP = `📖 *Команды*

☰ Меню — постоянная кнопка снизу, открывает настройки в любой момент
/menu — главное меню
/model — выбрать модель GPT
/text — режим чата
/image — режим генерации картинок
/reset — очистить историю диалога
/help — эта подсказка`;

export async function handleHelp(ctx: Context) {
  await ctx.reply(HELP, { parse_mode: "Markdown" });
}
