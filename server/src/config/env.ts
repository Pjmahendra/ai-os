import { config } from "dotenv";
import { z } from "zod";

config();

export const env = z
  .object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().optional(),
    JWT_SECRET: z.string().min(32)
  })
  .parse(process.env);