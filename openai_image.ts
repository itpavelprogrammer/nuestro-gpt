import { openai } from "./openai_client.js";
import { config } from "./config.js";

export interface ImageResult {
  buffer: Buffer;
  model: string;
  size: string;
  quality: string;
}

export async function generateImage(opts: {
  prompt: string;
  size: string;
  quality: string;
}): Promise<ImageResult> {
  // OpenAI SDK типизирует size/quality жёстко под старые модели,
  // поэтому пропускаем через `as any` — gpt-image-2 принимает то же,
  // что и gpt-image-1, плюс новые опции.
  const response = await openai.images.generate({
    model: config.IMAGE_MODEL,
    prompt: opts.prompt,
    size: opts.size as any,
    quality: opts.quality as any,
    n: 1,
  } as any);

  const data = response.data?.[0];
  if (!data) throw new Error("OpenAI вернул пустой ответ");

  // gpt-image-* по умолчанию возвращает base64
  if (data.b64_json) {
    return {
      buffer: Buffer.from(data.b64_json, "base64"),
      model: config.IMAGE_MODEL,
      size: opts.size,
      quality: opts.quality,
    };
  }

  // Фоллбэк: если вдруг URL
  if (data.url) {
    const res = await fetch(data.url);
    if (!res.ok) throw new Error(`Не удалось скачать картинку: ${res.status}`);
    const arr = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arr),
      model: config.IMAGE_MODEL,
      size: opts.size,
      quality: opts.quality,
    };
  }

  throw new Error("OpenAI не вернул ни b64_json, ни url");
}
