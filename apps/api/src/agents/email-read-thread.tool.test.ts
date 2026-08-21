import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../services/email.service.js", () => ({
  findThreadId: vi.fn(),
  getThread: vi.fn()
}));

import { findThreadId, getThread } from "../services/email.service.js";
import {
  EmailReadThreadTool,
  resolveThreadId
} from "./email-read-thread.tool.js";

describe("resolveThreadId", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses threadId directly when given, without calling findThreadId", async () => {
    const result = await resolveThreadId("user-1", {
      threadId: "t1"
    });

    expect(result).toBe("t1");
    expect(findThreadId).not.toHaveBeenCalled();
  });

  it("resolves via subject/from when threadId isn't given", async () => {
    vi.mocked(findThreadId).mockResolvedValue("t2");

    const result = await resolveThreadId("user-1", {
      subject: "Regards",
      from: "mahendra"
    });

    expect(result).toBe("t2");
    expect(findThreadId).toHaveBeenCalledWith("user-1", {
      subject: "Regards",
      from: "mahendra"
    });
  });

  it("throws when neither threadId nor subject/from is given", async () => {
    await expect(resolveThreadId("user-1", {})).rejects.toThrow(
      "threadId, or subject/from to identify the thread, is required"
    );

    expect(findThreadId).not.toHaveBeenCalled();
  });

  it("propagates a multiple-matches error from findThreadId", async () => {
    vi.mocked(findThreadId).mockRejectedValue(
      new Error("2 matching threads were found - be more specific")
    );

    await expect(
      resolveThreadId("user-1", { subject: "Regards" })
    ).rejects.toThrow("be more specific");
  });
});

describe("EmailReadThreadTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requires a userId", async () => {
    const tool = new EmailReadThreadTool();

    await expect(
      tool.execute({ threadId: "t1" }, {})
    ).rejects.toThrow("email.readThread requires a userId");
  });

  it("reads the resolved thread", async () => {
    vi.mocked(getThread).mockResolvedValue({
      id: "t1",
      messages: []
    } as never);

    const tool = new EmailReadThreadTool();
    const result = await tool.execute(
      { threadId: "t1" },
      { userId: "user-1" }
    );

    expect(getThread).toHaveBeenCalledWith("user-1", "t1");
    expect(result).toEqual({ id: "t1", messages: [] });
  });
});
