import { openai } from "./openai_client.js";
import { config } from "./config.js";
import { logger } from "./utils_logger.js";

/**
 * Скачивает файл из Telegram и расшифровывает его через OpenAI Whisper.
 * @param fileId Telegram file_id голосового/аудио сообщения
 * @param getFileUrl функция, возвращающая прямой URL для скачивания файла
 */
export async function transcribeTelegramVoice(
  fileUrl: string,
  filename = "voice.oga"
): Promise<string> {
  logger.debug({ fileUrl }, "Downloading voice file");
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Не удалось скачать голосовое: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();

  // Создаём File-подобный объект для OpenAI SDK
  const file = new File([arrayBuffer], filename, {
    type: "audio/ogg",
  });

  logger.debug({ size: arrayBuffer.byteLength, model: config.STT_MODEL }, "Sending to Whisper");

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: config.STT_MODEL,
  });

  return transcription.text.trim();
}
