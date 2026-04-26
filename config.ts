import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(10, "TELEGRAM_BOT_TOKEN is required"),
  OPENAI_API_KEY: z.string().min(10, "OPENAI_API_KEY is required"),

  // Список Telegram ID администраторов через запятую: "12345,67890"
  ADMIN_IDS: z
    .string()
    .min(1, "ADMIN_IDS is required (хотя бы один Telegram ID)")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => {
          const n = Number(x);
          if (!Number.isInteger(n)) throw new Error(`ADMIN_IDS: "${x}" не число`);
          return n;
        })
    ),

  DEFAULT_TEXT_MODEL: z.string().default("gpt-5.4-mini"),
  // Модель для распознавания голосовых сообщений (Speech-to-Text)
  STT_MODEL: z.string().default("whisper-1"),
  HISTORY_LIMIT: z.coerce.number().int().min(0).max(200).default(50),
  DB_PATH: z.string().default("./data/bot.db"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export function isAdmin(telegramId: number): boolean {
  return config.ADMIN_IDS.includes(telegramId);
}

// Доступные модели для меню выбора
export const TEXT_MODELS = [
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-5.4-pro",
] as const;
export type TextModel = (typeof TEXT_MODELS)[number];
