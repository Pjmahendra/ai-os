export interface LLMMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface LLMRequest {
  readonly messages: readonly LLMMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface LLMResponse {
  readonly content: string;
  readonly model: string;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
}

export interface LLMProvider {
  readonly name: string;

  chat(request: LLMRequest): Promise<LLMResponse>;
}