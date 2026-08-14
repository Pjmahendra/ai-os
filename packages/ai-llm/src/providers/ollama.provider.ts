import axios, { type AxiosInstance } from "axios";
import { env } from "@ai-os/config";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "../types.js";

interface OllamaResponse {
  readonly model: string;
  readonly response: string;
  readonly prompt_eval_count?: number;
  readonly eval_count?: number;
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  private readonly client: AxiosInstance;

  constructor(
    private readonly model: string = env.OLLAMA_MODEL
  ) {
    this.client = axios.create({
      baseURL: env.OLLAMA_URL,
      timeout: 120_000
    });
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
  const response = await this.client.post<OllamaResponse>(
    "/api/chat",
    {
      model: this.model,
      messages: request.messages,
      stream: false,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens
      }
    }
  );

  const data = response.data;

  const hasPromptTokens =
    data.prompt_eval_count !== undefined;

  const hasCompletionTokens =
    data.eval_count !== undefined;

  const hasTotalTokens =
    hasPromptTokens && hasCompletionTokens;

  return {
    content: data.response,
    model: data.model,

    ...(hasPromptTokens
      ? {
          promptTokens: data.prompt_eval_count
        }
      : {}),

    ...(hasCompletionTokens
      ? {
          completionTokens: data.eval_count
        }
      : {}),

    ...(hasTotalTokens
      ? {
          totalTokens:
            data.prompt_eval_count! +
            data.eval_count!
        }
      : {})
  };
}
}