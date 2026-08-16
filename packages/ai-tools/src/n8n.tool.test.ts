import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { N8NExecuteTool } from "./n8n.tool.js";

function jsonResponse(
  status: number,
  body: unknown
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("N8NExecuteTool", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects an unknown workflow key", async () => {
    const tool = new N8NExecuteTool();

    await expect(
      tool.execute(
        { workflow: "not-a-real-workflow" },
        {}
      )
    ).rejects.toThrow(
      "Unknown n8n workflow: not-a-real-workflow"
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns the parsed JSON body on success", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse(200, { success: true, message: "ok" })
    );

    const tool = new N8NExecuteTool();

    const result = await tool.execute(
      { workflow: "ai-os-test", message: "hi" },
      {}
    );

    expect(result).toEqual({ success: true, message: "ok" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("strips the workflow key from the outgoing payload", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse(200, {})
    );

    const tool = new N8NExecuteTool();

    await tool.execute(
      { workflow: "ai-os-test", message: "hi" },
      {}
    );

    const [, init] = (global.fetch as any).mock.calls[0];
    const sentBody = JSON.parse(init.body);

    expect(sentBody).toEqual({ message: "hi" });
  });

  it("does not retry a 4xx (non-retryable) failure", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response("bad request", { status: 400 })
    );

    const tool = new N8NExecuteTool();

    await expect(
      tool.execute({ workflow: "ai-os-test" }, {})
    ).rejects.toThrow("n8n request failed (400)");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a 500 and succeeds on the second attempt", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(
        new Response("boom", { status: 500 })
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true })
      );

    const tool = new N8NExecuteTool();

    const result = await tool.execute(
      { workflow: "ai-os-test" },
      {}
    );

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("gives up and throws the underlying error after exhausting retries", async () => {
    // A fresh Response each call — Response bodies can only be read
    // once, and every retry attempt reads the error body via .text().
    (global.fetch as any).mockImplementation(() =>
      Promise.resolve(
        new Response("still broken", { status: 503 })
      )
    );

    const tool = new N8NExecuteTool();

    await expect(
      tool.execute({ workflow: "ai-os-test" }, {})
    ).rejects.toThrow("n8n request failed (503)");

    expect(global.fetch).toHaveBeenCalledTimes(3);
  }, 10_000);

  it("retries a network error and succeeds", async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const tool = new N8NExecuteTool();

    const result = await tool.execute(
      { workflow: "ai-os-test" },
      {}
    );

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  }, 10_000);
});
