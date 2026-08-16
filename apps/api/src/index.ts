import app from "./app.js";
import { env } from "@ai-os/config";
import { prisma } from "./database/prisma.js";
import { logger } from "./config/logger.js";

async function bootstrap() {
  await prisma.$connect();

  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error(err);
  process.exit(1);
});