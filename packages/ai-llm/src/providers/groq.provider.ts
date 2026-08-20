import axios, { type AxiosInstance } from "axios";
import { env } from "@ai-os/config";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "../types.js";

interface GroqResponse {
  readonly model?: string;

  readonly choices?: readonly [
    {
      readonly message?: {
        readonly role?: string;
        readonly content?: string;
      };
    },
    ...{
      readonly message?: {
        readonly role?: string;
        readonly content?: string;
      };
    }[]
  ];

  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
}

// Groq's API is OpenAI-compatible chat completions - LLMMessage's
// role/content shape maps straight across with no reshaping needed,
// unlike Gemini's separate systemInstruction field.
export class GroqProvider implements LLMProvider {
  readonly name = "groq";

  private readonly client: AxiosInstance;

  constructor(
    private readonly model: string = env.GROQ_MODEL
  ) {
    this.client = axios.create({
      baseURL: "https://api.groq.com/openai/v1",

      timeout: 120_000,

      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
  }

  async chat(
    request: LLMRequest
  ): Promise<LLMResponse> {
    const response =
      await this.client.post<GroqResponse>(
        "/chat/completions",
        {
          model: this.model,
          messages: request.messages,

          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),

          ...(request.maxTokens !== undefined
            ? { max_tokens: request.maxTokens }
            : {})
        }
      );

    const data = response.data;

    const content = data.choices?.[0]?.message?.content;

    if (
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      throw new Error(
        "Groq returned an empty assistant message"
      );
    }

    return {
      content,
      model: data.model ?? this.model,

      ...(data.usage?.prompt_tokens !== undefined
        ? { promptTokens: data.usage.prompt_tokens }
        : {}),

      ...(data.usage?.completion_tokens !== undefined
        ? { completionTokens: data.usage.completion_tokens }
        : {}),

      ...(data.usage?.total_tokens !== undefined
        ? { totalTokens: data.usage.total_tokens }
        : {})
    };
  }
}
