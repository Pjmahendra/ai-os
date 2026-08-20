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

    // Gmail integration - all optional so a dev environment that
    // doesn't use the email assistant isn't forced to set up a Google
    // Cloud OAuth app just to boot the API.
    GOOGLE_CLIENT_ID: z
        .string()
        .min(1)
        .optional(),

    GOOGLE_CLIENT_SECRET: z
        .string()
        .min(1)
        .optional(),

    GOOGLE_REDIRECT_URI: z
        .string()
        .url()
        .optional(),

    // 32-byte AES-256-GCM key, base64-encoded, for encrypting stored
    // Gmail OAuth tokens at rest.
    ENCRYPTION_KEY: z
        .string()
        .min(32)
        .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;