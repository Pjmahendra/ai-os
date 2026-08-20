import axios, { type AxiosInstance } from "axios";
import { env } from "@ai-os/config";
import type {
  LLMMessage,
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "../types.js";

interface GeminiContentPart {
  readonly text?: string;
}

interface GeminiContent {
  readonly role?: string;
  readonly parts?: readonly GeminiContentPart[];
}

interface GeminiResponse {
  readonly modelVersion?: string;

  readonly candidates?: readonly [
    {
      readonly content?: GeminiContent;
    },
    ...{
      readonly content?: GeminiContent;
    }[]
  ];

  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
    readonly totalTokenCount?: number;
  };
}

/**
 * Gemini's REST shape differs from OpenRouter/OpenAI-style chat: there's
 * no "system" role in `contents` - a system prompt goes in a separate
 * top-level `systemInstruction` field - and the assistant role is named
 * "model", not "assistant". This maps LLMRequest's flat OpenAI-style
 * messages array into that shape.
 */
function toGeminiRequest(
  messages: readonly LLMMessage[]
): {
  systemInstruction?: { parts: [{ text: string }] };
  contents: GeminiContent[];
} {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));

  return {
    ...(systemText.length > 0
      ? {
          systemInstruction: {
            parts: [{ text: systemText }] as [{ text: string }]
          }
        }
      : {}),

    contents
  };
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  private readonly client: AxiosInstance;

  constructor(
    private readonly model: string = env.GEMINI_MODEL
  ) {
    this.client = axios.create({
      baseURL:
        "https://generativelanguage.googleapis.com/v1beta",

      timeout: 120_000,

      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async chat(
    request: LLMRequest
  ): Promise<LLMResponse> {
    const { systemInstruction, contents } =
      toGeminiRequest(request.messages);

    const response =
      await this.client.post<GeminiResponse>(
        `/models/${this.model}:generateContent`,
        {
          ...(systemInstruction
            ? { systemInstruction }
            : {}),

          contents,

          generationConfig: {
            ...(request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),

            ...(request.maxTokens !== undefined
              ? { maxOutputTokens: request.maxTokens }
              : {})
          }
        },
        {
          params: { key: env.GEMINI_API_KEY }
        }
      );

    const data = response.data;

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("");

    if (
      typeof text !== "string" ||
      text.trim().length === 0
    ) {
      throw new Error(
        "Gemini returned an empty assistant message"
      );
    }

    return {
      content: text,
      model: data.modelVersion ?? this.model,

      ...(data.usageMetadata?.promptTokenCount !== undefined
        ? {
            promptTokens:
              data.usageMetadata.promptTokenCount
          }
        : {}),

      ...(data.usageMetadata?.candidatesTokenCount !== undefined
        ? {
            completionTokens:
              data.usageMetadata.candidatesTokenCount
          }
        : {}),

      ...(data.usageMetadata?.totalTokenCount !== undefined
        ? {
            totalTokens:
              data.usageMetadata.totalTokenCount
          }
        : {})
    };
  }
}
