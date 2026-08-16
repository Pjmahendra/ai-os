import axios, { type AxiosInstance } from "axios";
import { env } from "@ai-os/config";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "../types.js";

interface OpenRouterResponse {
  readonly model: string;

  readonly choices: readonly [
    {
      readonly message: {
        readonly role: string;
        readonly content?: string | null;
      };
    },
    ...{
      readonly message: {
        readonly role: string;
        readonly content?: string | null;
      };
    }[]
  ];

  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
}

export class OpenRouterProvider
  implements LLMProvider
{
  readonly name = "openrouter";

  private readonly client: AxiosInstance;

  constructor(
    private readonly model: string =
      env.OPENROUTER_MODEL
  ) {
    this.client = axios.create({
      baseURL:
        "https://openrouter.ai/api/v1",

      timeout: 120_000,

      headers: {
        Authorization:
          `Bearer ${env.OPENROUTER_API_KEY}`,

        "Content-Type":
          "application/json"
      }
    });
  }

  async chat(
    request: LLMRequest
  ): Promise<LLMResponse> {
    const response =
      await this.client.post<OpenRouterResponse>(
        "/chat/completions",
        {
          model: this.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens
        }
      );

    const data = response.data;

    const message =
      data.choices?.[0]?.message;

    if (!message) {
      throw new Error(
        "OpenRouter returned no assistant message"
      );
    }

    if (
      typeof message.content !== "string" ||
      message.content.trim().length === 0
    ) {
      throw new Error(
        "OpenRouter returned an empty assistant message"
      );
    }

    return {
      content: message.content,
      model: data.model,

      ...(data.usage?.prompt_tokens !== undefined
        ? {
            promptTokens:
              data.usage.prompt_tokens
          }
        : {}),

      ...(data.usage?.completion_tokens !== undefined
        ? {
            completionTokens:
              data.usage.completion_tokens
          }
        : {}),

      ...(data.usage?.total_tokens !== undefined
        ? {
            totalTokens:
              data.usage.total_tokens
          }
        : {})
    };
  }
}