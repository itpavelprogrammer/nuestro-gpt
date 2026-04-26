import { createBot } from "./bot.js";
import { logger } from "./utils/logger.js";
import { closeDb } from "./db/index.js";

async function main() {
  const bot = createBot();

  const me = await bot.api.getMe();
  logger.info({ username: me.username, id: me.id }, "🤖 Bot starting...");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down...");
    await bot.stop();
    closeDb();
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await bot.start({
    onStart: (botInfo) => {
      logger.info(`✅ @${botInfo.username} is running (long polling)`);
    },
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
