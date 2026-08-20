import { describe, expect, it, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

import { GroqProvider } from "./groq.provider.js";

const mockedAxios = axios as unknown as {
  create: ReturnType<typeof vi.fn>;
};

function mockClient(post: ReturnType<typeof vi.fn>) {
  mockedAxios.create = vi.fn().mockReturnValue({ post });
}

describe("GroqProvider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sends messages straight through with no reshaping (OpenAI-compatible)", async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        model: "openai/gpt-oss-20b",
        choices: [{ message: { role: "assistant", content: "Hi there!" } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      }
    });
    mockClient(post);

    const provider = new GroqProvider("openai/gpt-oss-20b");

    const result = await provider.chat({
      messages: [
        { role: "system", content: "Be helpful." },
        { role: "user", content: "Hello" }
      ]
    });

    expect(post).toHaveBeenCalledWith(
      "/chat/completions",
      expect.objectContaining({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "Be helpful." },
          { role: "user", content: "Hello" }
        ]
      })
    );

    expect(result).toEqual({
      content: "Hi there!",
      model: "openai/gpt-oss-20b",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15
    });
  });

  it("passes temperature and maxTokens through when provided", async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        choices: [{ message: { content: "ok" } }]
      }
    });
    mockClient(post);

    const provider = new GroqProvider("openai/gpt-oss-20b");

    await provider.chat({
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.2,
      maxTokens: 500
    });

    expect(post).toHaveBeenCalledWith(
      "/chat/completions",
      expect.objectContaining({
        temperature: 0.2,
        max_tokens: 500
      })
    );
  });

  it("throws on an empty assistant message", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { choices: [{ message: { content: "" } }] }
    });
    mockClient(post);

    const provider = new GroqProvider("openai/gpt-oss-20b");

    await expect(
      provider.chat({ messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow("Groq returned an empty assistant message");
  });

  it("throws when no choices are returned at all", async () => {
    const post = vi.fn().mockResolvedValue({ data: {} });
    mockClient(post);

    const provider = new GroqProvider("openai/gpt-oss-20b");

    await expect(
      provider.chat({ messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow("Groq returned an empty assistant message");
  });

  it("omits usage fields when the response doesn't include them", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { model: "openai/gpt-oss-20b", choices: [{ message: { content: "ok" } }] }
    });
    mockClient(post);

    const provider = new GroqProvider("openai/gpt-oss-20b");
    const result = await provider.chat({
      messages: [{ role: "user", content: "hi" }]
    });

    expect(result).toEqual({
      content: "ok",
      model: "openai/gpt-oss-20b"
    });
  });
});
