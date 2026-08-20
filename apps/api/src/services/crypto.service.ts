import crypto from "node:crypto";
import { env } from "@ai-os/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  if (!env.ENCRYPTION_KEY) {
    throw new Error(
      "ENCRYPTION_KEY is required to encrypt/decrypt stored tokens."
    );
  }

  const key = Buffer.from(env.ENCRYPTION_KEY, "base64");

  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM."
    );
  }

  return key;
}

/**
 * Encrypts a string for storage. Output is
 * "<iv>:<authTag>:<ciphertext>", each base64-encoded, so it's a single
 * opaque string safe to store in a text column.
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getKey(),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64")
  ].join(":");
}

export function decrypt(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":");

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error(
      "Invalid encrypted value: expected <iv>:<authTag>:<ciphertext>"
    );
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64")
  );

  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}
