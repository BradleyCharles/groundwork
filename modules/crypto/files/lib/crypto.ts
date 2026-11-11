import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  // The message deliberately omits the value.
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  return key;
}

/** AES-256-GCM. Output is `v1:` plus base64 of iv, auth tag and ciphertext. The prefix allows a later key or algorithm change. */
export function encrypt(plaintext: string, key: Buffer = loadKey()): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")}`;
}

/** Throws if the version is unknown, the data was changed, or the key is wrong. */
export function decrypt(payload: string, key: Buffer = loadKey()): string {
  const sep = payload.indexOf(":");
  if (sep === -1 || payload.slice(0, sep) !== VERSION)
    throw new Error("Unsupported ciphertext version");
  const data = Buffer.from(payload.slice(sep + 1), "base64");
  if (data.length < IV_BYTES + TAG_BYTES) throw new Error("Ciphertext is malformed");
  const decipher = createDecipheriv(ALGORITHM, key, data.subarray(0, IV_BYTES));
  decipher.setAuthTag(data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([
    decipher.update(data.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
}
