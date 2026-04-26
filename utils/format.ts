// Telegram максимум — 4096 символов на сообщение
export const TG_MAX_LENGTH = 4000;

/** Разбивает длинный текст на куски, стараясь резать по переносам строк. */
export function splitMessage(text: string, max = TG_MAX_LENGTH): string[] {
  if (text.length <= max) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = remaining.lastIndexOf(" ", max);
    if (cut <= 0) cut = max;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining.length) chunks.push(remaining);
  return chunks;
}
