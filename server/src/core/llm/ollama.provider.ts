import axios from "axios";
import { ChatMessage, LLMProvider } from "./llm.js";

export class OllamaProvider implements LLMProvider {
  constructor(
    private readonly model = "qwen3:4b",
    private readonly host = "http://127.0.0.1:11434"
  ) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    const prompt = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const { data } = await axios.post(
      `${this.host}/api/generate`,
      {
        model: this.model,
        prompt,
        stream: false
      }
    );

    return data.response;
  }
}