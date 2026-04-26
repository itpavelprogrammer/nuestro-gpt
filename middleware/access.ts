import type { Context, NextFunction } from "grammy";
import { isAdmin } from "../config.js";
import { upsertUser, getUser } from "../db/users.js";
import { notifyAdminsAboutRequest } from "../handlers/admin.js";

const PENDING_TEXT =
  "⏳ Твоя заявка отправлена администратору. Дождись одобрения.";
const BLOCKED_TEXT = "🚫 Доступ к боту закрыт.";

/**
 * Middleware доступа.
 * Пропускает админов всегда.
 * Для остальных — проверяет статус в БД. На /start новому юзеру создаёт
 * заявку и уведомляет админов. На любое другое действие — показывает статус.
 */
export async function accessGuard(ctx: Context, next: NextFunction) {
  if (!ctx.from) return; // системные апдейты пропускаем
  const userId = ctx.from.id;

  // Админы — всегда внутрь
  if (isAdmin(userId)) {
    return next();
  }

  // Регистрируем юзера в БД (если новый — статус 'pending')
  upsertUser({
    telegramId: userId,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
  });
  const user = getUser(userId)!;

  if (user.status === "approved") {
    return next();
  }

  if (user.status === "blocked") {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: BLOCKED_TEXT, show_alert: true });
    } else {
      await ctx.reply(BLOCKED_TEXT);
    }
    return;
  }

  // status === 'pending'
  // Если это /start — отправляем заявку админам (один раз — повторные /start
  // только показывают статус, заявка уже создана при первом /start, но мы
  // дублируем уведомление, чтобы админ точно увидел)
  const text = (ctx.message as { text?: string } | undefined)?.text ?? "";
  if (text.startsWith("/start")) {
    await notifyAdminsAboutRequest(ctx, {
      id: userId,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
    });
    await ctx.reply(
      "👋 Привет! Этот бот работает по доступу.\n\n" + PENDING_TEXT
    );
    return;
  }

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({ text: PENDING_TEXT, show_alert: true });
  } else {
    await ctx.reply(PENDING_TEXT);
  }
}
