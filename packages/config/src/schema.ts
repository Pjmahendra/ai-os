import { z } from "zod";

export const ConfigSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(3000),

    DATABASE_URL: z
        .string()
        .min(1),

    JWT_SECRET: z
        .string()
        .min(32),
    AI_PROVIDER: z
        .enum(["gemini", "ollama"])
        .default("gemini"),
    OLLAMA_URL: z
        .string()
        .url()
        .default("http://127.0.0.1:11434"),

    OLLAMA_MODEL: z
        .string()
        .min(1)
        .default("qwen3:4b"),
    GEMINI_API_KEY: z
        .string()
        .min(1),

    GEMINI_MODEL: z
        .string()
        .min(1)
        .default("gemini-2.5-flash"),
});

export type Config = z.infer<typeof ConfigSchema>;