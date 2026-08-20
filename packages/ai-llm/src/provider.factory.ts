import { env } from "@ai-os/config";
import type { LLMProvider } from "./types.js";
import { OllamaProvider } from "./providers/ollama.provider.js";
import { GroqProvider } from "./providers/groq.provider.js";

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
    if (!env.GROQ_API_KEY) {
      throw new Error(
        "GROQ_API_KEY is required for online mode."
      );
    }

    return new GroqProvider();
  }

  if (!env.GROQ_API_KEY) {
    return ollama;
  }

  return new FallbackProvider(
    new GroqProvider(),
    ollama
  );
}