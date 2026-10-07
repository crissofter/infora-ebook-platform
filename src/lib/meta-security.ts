import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "node:crypto";

export function encryptMetaToken(token: string, key: string) {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32) throw new Error("META_TOKEN_ENCRYPTION_KEY must be 32 bytes in base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", bytes, iv);
  const payload = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), payload].map((part) => part.toString("base64url")).join(".");
}

export function decryptMetaToken(value: string, key: string) {
  const [iv, tag, payload] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}

export function signMetaState(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifyMetaState(value: string, signature: string, secret: string) {
  const expected = Buffer.from(signMetaState(value, secret));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function pausedCampaignPayload(name: string) {
  return { name, objective: "OUTCOME_TRAFFIC", status: "PAUSED", special_ad_categories: "[]" };
}
