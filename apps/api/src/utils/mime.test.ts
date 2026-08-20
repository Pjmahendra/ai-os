import { describe, expect, it } from "vitest";
import { buildRawMessage } from "./mime.js";

function decode(raw: string): string {
  return Buffer.from(raw, "base64url").toString("utf-8");
}

describe("buildRawMessage", () => {
  it("includes To, Subject, and the body", () => {
    const decoded = decode(
      buildRawMessage({
        to: "someone@example.com",
        subject: "Hello there",
        body: "Just checking in."
      })
    );

    expect(decoded).toContain("To: someone@example.com");
    expect(decoded).toContain("Subject: Hello there");
    expect(decoded).toContain("Just checking in.");
  });

  it("leaves an ASCII subject unencoded", () => {
    const decoded = decode(
      buildRawMessage({
        to: "a@x.com",
        subject: "Re: Project update",
        body: "..."
      })
    );

    expect(decoded).toContain("Subject: Re: Project update");
  });

  it("RFC 2047-encodes a non-ASCII subject", () => {
    const decoded = decode(
      buildRawMessage({
        to: "a@x.com",
        subject: "Café meeting ☕",
        body: "..."
      })
    );

    const subjectLine = decoded
      .split("\r\n")
      .find((line) => line.startsWith("Subject:"));

    expect(subjectLine).toMatch(/^Subject: =\?UTF-8\?B\?.+\?=$/);

    // Round-trip the encoded word back to confirm it actually carries
    // the original text, not just *some* base64 blob.
    const encodedWord = subjectLine!.replace(
      /^Subject: =\?UTF-8\?B\?(.+)\?=$/,
      "$1"
    );
    expect(Buffer.from(encodedWord, "base64").toString("utf-8")).toBe(
      "Café meeting ☕"
    );
  });

  it("omits In-Reply-To/References when not replying", () => {
    const decoded = decode(
      buildRawMessage({
        to: "a@x.com",
        subject: "New email",
        body: "..."
      })
    );

    expect(decoded).not.toContain("In-Reply-To:");
    expect(decoded).not.toContain("References:");
  });

  it("sets In-Reply-To and References to the real Message-ID when replying", () => {
    const messageId = "<abc123@mail.gmail.com>";
    const decoded = decode(
      buildRawMessage({
        to: "a@x.com",
        subject: "Re: thread",
        body: "...",
        inReplyTo: messageId
      })
    );

    expect(decoded).toContain(`In-Reply-To: ${messageId}`);
    expect(decoded).toContain(`References: ${messageId}`);
  });

  it("separates headers from the body with a blank line", () => {
    const decoded = decode(
      buildRawMessage({
        to: "a@x.com",
        subject: "Subj",
        body: "Line one\nLine two"
      })
    );

    expect(decoded).toContain("\r\n\r\nLine one\nLine two");
  });

  it("produces output that decodes back to valid UTF-8 with a non-ASCII body", () => {
    const decoded = decode(
      buildRawMessage({
        to: "a@x.com",
        subject: "Plain subject",
        body: "Thanks! 🎉 café"
      })
    );

    expect(decoded).toContain("Thanks! 🎉 café");
  });
});
