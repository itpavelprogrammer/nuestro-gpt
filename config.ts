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

  IMAGE_MODEL: z.string().default("gpt-image-2"),
  DEFAULT_TEXT_MODEL: z.string().default("gpt-5.4-mini"),
  HISTORY_LIMIT: z.coerce.number().int().min(0).max(200).default(20),
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
export const TEXT_MODELS = ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.4-pro"] as const;
export type TextModel = (typeof TEXT_MODELS)[number];

export const IMAGE_SIZES = [
  { value: "auto", label: "🪄 ОРИГИНАЛЬНЫЙ (авто)" },
  { value: "1024x1024", label: "⬛ 1:1 (1024×1024)" },
  { value: "1024x1536", label: "📱 2:3 (1024×1536)" },
  { value: "1536x1024", label: "🖼 3:2 (1536×1024)" },
  { value: "1024x1792", label: "📲 9:16 (1024×1792)" },
  { value: "1792x1024", label: "🖥 16:9 (1792×1024)" },
] as const;

export const IMAGE_QUALITIES = [
  { value: "low", label: "Low (быстро)" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High (лучшее)" },
] as const;
