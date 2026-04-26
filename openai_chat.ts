import { openai } from "./openai_client.js";
import type { DbMessage } from "./db_messages.js";

const SYSTEM_PROMPT =
  "Ты — полезный AI-ассистент в Telegram. Отвечай ясно и по делу. " +
  "Поддерживай язык пользователя. Если код — оборачивай в тройные бэктики.";

export interface ChatResult {
  content: string;
  model: string;
}

export async function chatWithGpt(
  model: string,
  history: DbMessage[],
  userMessage: string
): Promise<ChatResult> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model,
    messages,
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  return { content: content || "(пустой ответ)", model };
}
