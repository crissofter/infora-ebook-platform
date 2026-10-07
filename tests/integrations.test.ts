import assert from "node:assert/strict";
import { test } from "node:test";
import { imageFormat, safeCheckoutUrl } from "../src/lib/media.ts";
import { generateIllustration } from "../src/lib/ai/images.ts";
import { encryptMetaToken, decryptMetaToken, signMetaState, verifyMetaState, pausedCampaignPayload } from "../src/lib/meta-security.ts";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOZkAAAAASUVORK5CYII=", "base64");

test("uploads accept raster signatures and reject SVG, HTML and empty files", () => {
  assert.equal(imageFormat(png), "png");
  assert.equal(imageFormat(Buffer.from('<svg onload="alert(1)"/>')), null);
  assert.equal(imageFormat(Buffer.from('<html></html>')), null);
  assert.equal(imageFormat(new Uint8Array()), null);
});

test("checkout accepts public HTTPS and rejects unsafe protocols or embedded credentials", () => {
  assert.equal(safeCheckoutUrl("https://pay.kiwify.com.br/example"), true);
  for (const url of ["javascript:alert(1)", "http://example.com", "https://user:pass@example.com", "https://localhost", "https://127.0.0.1", "https://192.168.1.1"]) assert.equal(safeCheckoutUrl(url), false);
});

test("image provider request uses requested orientation and saves decoded raster bytes", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/images/generations");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.size, "1536x1024");
    assert.equal(body.output_format, "webp");
    assert.equal(body.n, 1);
    return Response.json({ data: [{ b64_json: png.toString("base64") }] });
  };
  const result = await generateIllustration({ apiKey: "synthetic-test-key", model: "gpt-image-1", prompt: "Ilustração editorial", cover: false }, fakeFetch);
  assert.equal(calls, 1); assert.equal(result.format, "png"); assert.deepEqual(result.bytes, png);
});

test("image provider errors do not expose API credentials or persist invalid content", async () => {
  const settings = { apiKey: "synthetic-test-key", model: "gpt-image-1", prompt: "Capa editorial", cover: true };
  await assert.rejects(() => generateIllustration(settings, async () => Response.json({ error: { message: "synthetic-test-key" } }, { status: 401 })), /não autorizou/);
  await assert.rejects(() => generateIllustration(settings, async () => Response.json({ data: [{ b64_json: Buffer.from("<svg/>").toString("base64") }] })), /formato de imagem inválido/);
});

test("Meta credentials are encrypted with authenticated encryption", () => {
  const key = Buffer.alloc(32, 42).toString("base64");
  const encrypted = encryptMetaToken("synthetic-meta-token", key);
  assert.ok(!encrypted.includes("synthetic-meta-token"));
  assert.equal(decryptMetaToken(encrypted, key), "synthetic-meta-token");
  const parts = encrypted.split(".");
  const payload = Buffer.from(parts[2], "base64url"); payload[0] ^= 1; parts[2] = payload.toString("base64url");
  assert.throws(() => decryptMetaToken(parts.join("."), key));
  assert.throws(() => encryptMetaToken("token", "invalid"));
});

test("Meta authorization state rejects tampering and wrong signing keys", () => {
  const signature = signMetaState("bound-user-and-organization", "synthetic-secret");
  assert.equal(verifyMetaState("bound-user-and-organization", signature, "synthetic-secret"), true);
  assert.equal(verifyMetaState("other-organization", signature, "synthetic-secret"), false);
  assert.equal(verifyMetaState("bound-user-and-organization", signature, "other-secret"), false);
});

test("Meta campaign requests cannot activate ads or assign spending", () => {
  const payload = pausedCampaignPayload("Campanha de teste");
  assert.equal(payload.status, "PAUSED");
  assert.equal(payload.objective, "OUTCOME_TRAFFIC");
  for (const field of ["daily_budget", "lifetime_budget", "adsets", "ads"]) assert.equal(field in payload, false);
});
