import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { config, isAdmin } from "./config.js";
import { logger } from "./utils_logger.js";
import { getUser, setUserStatus, listUsers, countByStatus } from "./db_users.js";

/** Уведомить всех админов о новой заявке. */
export async function notifyAdminsAboutRequest(
  ctx: Context,
  user: { id: number; username?: string; first_name?: string }
) {
  const card =
    `🆕 *Новая заявка на доступ*\n\n` +
    `*ID:* \`${user.id}\`\n` +
    `*Имя:* ${escape(user.first_name ?? "—")}\n` +
    `*Username:* ${user.username ? "@" + user.username : "—"}`;

  const kb = new InlineKeyboard()
    .text("✅ Одобрить", `admin:approve:${user.id}`)
    .text("❌ Отклонить", `admin:block:${user.id}`);

  for (const adminId of config.ADMIN_IDS) {
    try {
      await ctx.api.sendMessage(adminId, card, {
        parse_mode: "Markdown",
        reply_markup: kb,
      });
    } catch (e) {
      logger.warn({ err: e, adminId }, "Не удалось доставить заявку админу");
    }
  }
}

/** Обработка кнопок админа: admin:approve:<id> / admin:block:<id> */
export async function handleAdminCallback(ctx: Context): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("admin:")) return false;
  if (!ctx.from || !isAdmin(ctx.from.id)) {
    await ctx.answerCallbackQuery({ text: "Недостаточно прав", show_alert: true });
    return true;
  }

  const [, action, idStr] = data.split(":");
  const targetId = Number(idStr);
  const target = getUser(targetId);
  if (!target) {
    await ctx.answerCallbackQuery("Пользователь не найден");
    return true;
  }

  if (action === "approve") {
    setUserStatus(targetId, "approved", ctx.from.id);
    await ctx.editMessageText(
      `✅ *Одобрен*\n\nID: \`${targetId}\`\nИмя: ${escape(target.first_name ?? "—")}\nUsername: ${target.username ? "@" + target.username : "—"}\n\nРешение: ${ctx.from.first_name ?? ctx.from.id}`,
      { parse_mode: "Markdown" }
    );
    await safeNotify(ctx, targetId, "✅ Тебе одобрили доступ к боту! Напиши /start.");
    await ctx.answerCallbackQuery("Одобрено");
    return true;
  }

  if (action === "block") {
    setUserStatus(targetId, "blocked", ctx.from.id);
    await ctx.editMessageText(
      `❌ *Отклонён*\n\nID: \`${targetId}\`\nИмя: ${escape(target.first_name ?? "—")}\n\nРешение: ${ctx.from.first_name ?? ctx.from.id}`,
      { parse_mode: "Markdown" }
    );
    await safeNotify(ctx, targetId, "❌ В доступе отказано.");
    await ctx.answerCallbackQuery("Отклонено");
    return true;
  }

  await ctx.answerCallbackQuery();
  return true;
}

/** /users — список последних 100 юзеров */
export async function handleUsersList(ctx: Context) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;
  const users = listUsers();
  if (users.length === 0) {
    await ctx.reply("Пользователей нет.");
    return;
  }
  const lines = users.map((u) => {
    const icon = u.status === "approved" ? "✅" : u.status === "pending" ? "⏳" : "🚫";
    const name = u.first_name ?? "—";
    const un = u.username ? `@${u.username}` : "";
    return `${icon} \`${u.telegram_id}\` ${escape(name)} ${un}`.trim();
  });
  const stats =
    `⏳ ${countByStatus("pending")}  ` +
    `✅ ${countByStatus("approved")}  ` +
    `🚫 ${countByStatus("blocked")}`;

  // Бьём на куски, чтобы не упереться в лимит Telegram
  const header = `*Пользователи (${stats})*\n\n`;
  let buf = header;
  for (const line of lines) {
    if (buf.length + line.length + 1 > 3800) {
      await ctx.reply(buf, { parse_mode: "Markdown" });
      buf = "";
    }
    buf += line + "\n";
  }
  if (buf.trim()) await ctx.reply(buf, { parse_mode: "Markdown" });
}

/** /approve <id> */
export async function handleApproveCmd(ctx: Context) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;
  const arg = ctx.match?.toString().trim();
  const id = Number(arg);
  if (!Number.isInteger(id)) {
    await ctx.reply("Использование: /approve <telegram_id>");
    return;
  }
  if (!getUser(id)) {
    await ctx.reply("Пользователь не найден в БД.");
    return;
  }
  setUserStatus(id, "approved", ctx.from.id);
  await ctx.reply(`✅ ${id} одобрен.`);
  await safeNotify(ctx, id, "✅ Тебе одобрили доступ к боту! Напиши /start.");
}

/** /block <id> */
export async function handleBlockCmd(ctx: Context) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;
  const arg = ctx.match?.toString().trim();
  const id = Number(arg);
  if (!Number.isInteger(id)) {
    await ctx.reply("Использование: /block <telegram_id>");
    return;
  }
  if (!getUser(id)) {
    await ctx.reply("Пользователь не найден в БД.");
    return;
  }
  setUserStatus(id, "blocked", ctx.from.id);
  await ctx.reply(`🚫 ${id} заблокирован.`);
  await safeNotify(ctx, id, "❌ Доступ к боту отозван.");
}

async function safeNotify(ctx: Context, userId: number, text: string) {
  try {
    await ctx.api.sendMessage(userId, text);
  } catch (e) {
    logger.warn({ err: e, userId }, "Не удалось уведомить пользователя");
  }
}

/** Грубый эскейп для Markdown */
function escape(s: string): string {
  return s.replace(/([_*`\[\]])/g, "\\$1");
}
