import type { LLMMessage } from "@ai-os/ai-llm";

export interface RuntimeRequest {
  readonly message: string;
  readonly systemPrompt?: string;
  readonly conversation?: readonly LLMMessage[];
}

export interface RuntimeResponse {
  readonly content: string;
  readonly model: string;
}
