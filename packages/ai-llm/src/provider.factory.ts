import { env } from "@ai-os/config";
import type { LLMProvider } from "./types.js";
import { OllamaProvider } from "./providers/ollama.provider.js";
import { GeminiProvider } from "./providers/gemini.provider.js";

export type LLMMode = "auto" | "online" | "offline";

class FallbackProvider implements LLMProvider {
  readonly name = "auto";

  constructor(
    private readonly primary: LLMProvider,
    private readonly fallback: LLMProvider
  ) {}

  async chat(
    request: Parameters<LLMProvider["chat"]>[0]
  ) {
    try {
      return await this.primary.chat(request);
    } catch (error) {
      console.warn(
        `Primary LLM provider failed. Falling back to ${this.fallback.name}.`,
        error instanceof Error ? error.message : error
      );

      return this.fallback.chat(request);
    }
  }
}

export function createLLMProvider(
  mode: LLMMode = "auto"
): LLMProvider {
  const ollama = new OllamaProvider();

  if (mode === "offline") {
    return ollama;
  }

  if (mode === "online") {
    if (!env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is required for online mode."
      );
    }

    return new GeminiProvider();
  }

  if (!env.GEMINI_API_KEY) {
    console.error(
      "[createLLMProvider] GEMINI_API_KEY is falsy at runtime " +
        `(typeof=${typeof env.GEMINI_API_KEY}, length=${
          env.GEMINI_API_KEY ? String(env.GEMINI_API_KEY).length : 0
        }) - falling back to Ollama directly, no online attempt made.`
    );

    return ollama;
  }

  console.log(
    `[createLLMProvider] Using Gemini as primary (key length ${env.GEMINI_API_KEY.length}), Ollama as fallback.`
  );

  return new FallbackProvider(
    new GeminiProvider(),
    ollama
  );
}