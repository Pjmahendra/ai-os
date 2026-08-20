// Encodes a header value per RFC 2047 when it contains non-ASCII
// characters (required for e.g. non-Latin subjects); leaves plain
// ASCII untouched since encoding it would be needless noise.
function encodeHeaderValue(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

export interface RawMessageInput {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  // The RFC "Message-ID" header of the message being replied to
  // (e.g. "<abc123@mail.gmail.com>") - NOT Gmail's internal message
  // id. Setting In-Reply-To/References to this is what makes Gmail
  // thread the reply correctly instead of starting a new thread.
  readonly inReplyTo?: string;
}

// Builds an RFC 2822 message and base64url-encodes it the way
// Gmail's messages.send API requires for its `raw` field.
export function buildRawMessage(input: RawMessageInput): string {
  const headers: string[] = [
    `To: ${input.to}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    // 8bit, not 7bit - the body may contain non-ASCII characters and
    // isn't further transfer-encoded, so declaring 7bit would be a
    // lie about what's actually on the wire.
    "Content-Transfer-Encoding: 8bit"
  ];

  if (input.inReplyTo) {
    headers.push(`In-Reply-To: ${input.inReplyTo}`);
    headers.push(`References: ${input.inReplyTo}`);
  }

  const message = `${headers.join("\r\n")}\r\n\r\n${input.body}`;

  return Buffer.from(message, "utf-8").toString("base64url");
}
