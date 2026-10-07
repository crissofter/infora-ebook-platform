import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw new Error("Execute esta regressão somente no banco de desenvolvimento local.");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOZkAAAAASUVORK5CYII=", "base64");
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`ok ${name}`); }
async function api(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(BASE + path, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, json: await response.json(), cookie: (response.headers.get("set-cookie") ?? "").split(";")[0] };
}
async function signup(prefix) {
  const result = await api("/api/auth/signup", { method: "POST", body: { name: "Teste de mídia", email: `${prefix}-${Date.now()}@example.com`, password: "senha-sintetica-123", acceptTerms: true } });
  assert.equal(result.status, 200); return result.cookie;
}
async function upload(productId, cookie, kind, chapterId, bytes = png, filename = "imagem.png") {
  const form = new FormData(); form.set("kind", kind); form.set("file", new Blob([bytes], { type: "image/png" }), filename);
  if (chapterId) { form.set("chapterId", chapterId); form.set("caption", "Imagem de teste do capítulo"); }
  const response = await fetch(`${BASE}/api/products/${productId}/images`, { method: "POST", headers: { cookie }, body: form });
  return { status: response.status, json: await response.json() };
}

const owner = await signup("media-owner"); const other = await signup("media-other");
const created = await api("/api/products", { method: "POST", cookie: owner, body: { type: "EBOOK", idea: "Ebook para verificar imagens e divulgação", audience: "leitores de teste", objective: "verificar o fluxo completo", problem: "imagens ausentes", generate: true } });
assert.equal(created.status, 201); const id = created.json.data.product.id;
const detail = await api(`/api/products/${id}`, { cookie: owner }); const chapterId = detail.json.data.chapters[0].id;
const cover = await upload(id, owner, "COVER");
check("capa enviada", () => assert.equal(cover.status, 201));
const image = await upload(id, owner, "CHAPTER", chapterId);
check("imagem vinculada ao capítulo", () => assert.equal(image.status, 201));
const otherUpload = await upload(id, other, "CHAPTER", chapterId);
check("imagem de outra organização bloqueada", () => assert.equal(otherUpload.status, 403));
assert.equal((await upload(id, owner, "CHAPTER", chapterId, Buffer.from("<svg onload='alert(1)'/>"))).status, 422); checks++; console.log("ok SVG enviado como PNG é rejeitado");
assert.equal((await fetch(BASE + image.json.data.url)).status, 404); checks++; console.log("ok imagem de capítulo permanece privada");
assert.equal((await fetch(BASE + cover.json.data.url)).status, 404); checks++; console.log("ok capa de rascunho permanece privada");
const exported = await fetch(`${BASE}/products/${id}/export`, { headers: { cookie: owner } });
const html = await exported.text();
check("exportação inclui capa e imagem do capítulo", () => { assert.equal(exported.status, 200); assert.ok(html.includes(image.json.data.url)); assert.ok(html.includes(cover.json.data.url)); });
const notConfigured = await api(`/api/products/${id}/images/generate`, { method: "POST", cookie: owner, body: { kind: "CHAPTER", chapterId, prompt: "Ilustração editorial de teste" } });
check("IA informa configuração ausente sem fingir gerar imagem", () => { assert.equal(notConfigured.status, 503); assert.equal(notConfigured.json.code, "IMAGE_PROVIDER_NOT_CONFIGURED"); });
await api(`/api/products/${id}/generate`, { method: "POST", cookie: owner, body: { kind: "sales_page" } });
const invalid = await api(`/api/products/${id}/sales-page`, { method: "PATCH", cookie: owner, body: { checkoutUrl: "javascript:alert(1)" } });
check("checkout inseguro rejeitado", () => assert.equal(invalid.status, 422));
await api(`/api/products/${id}/sales-page`, { method: "PATCH", cookie: owner, body: { headline: "Oferta revisada no teste", checkoutUrl: "https://pay.kiwify.com.br/test-only", published: true } });
const publicResponse = await fetch(`${BASE}/s/${detail.json.data.product.slug}`); const publicHtml = await publicResponse.text();
check("página pública mostra capa e checkout configurado", () => { assert.equal(publicResponse.status, 200); assert.ok(publicHtml.includes("https://pay.kiwify.com.br/test-only")); assert.ok(publicHtml.includes(cover.json.data.url)); });
const publicCover = await fetch(BASE + cover.json.data.url);
check("capa publicada pode ser exibida sem sessão", () => assert.equal(publicCover.status, 200));
const event = await api("/api/public/events", { method: "POST", body: { slug: detail.json.data.product.slug, type: "checkout_started" } });
check("checkout externo registra clique sem simular pagamento", () => assert.equal(event.json.data.checkout, "external"));
await api("/api/billing/plan", { method: "POST", cookie: owner, body: { planCode: "CREATOR" } });
const marketing = await api(`/api/products/${id}/generate`, { method: "POST", cookie: owner, body: { kind: "marketing" } });
assert.equal(marketing.status, 200); const item = marketing.json.data.items[0];
const edit = await api(`/api/content/${item.id}`, { method: "PATCH", cookie: owner, body: { title: "Texto revisado", body: "Texto pronto para divulgar.", cta: "Confira a oferta" } });
check("marketing editável", () => { assert.equal(edit.status, 200); assert.equal(edit.json.data.title, "Texto revisado"); });
const noDate = await api(`/api/content/${item.id}`, { method: "PATCH", cookie: owner, body: { status: "SCHEDULED", scheduledFor: null } });
check("planejamento exige data futura", () => assert.equal(noDate.status, 422));
const fakePublish = await api(`/api/content/${item.id}`, { method: "PATCH", cookie: owner, body: { status: "PUBLISHED" } });
check("publicação automática indisponível não é simulada", () => assert.equal(fakePublish.status, 409));
const manual = await api(`/api/content/${item.id}`, { method: "PATCH", cookie: owner, body: { status: "PUBLISHED", publication: "manual" } });
check("publicação manual exige confirmação explícita", () => { assert.equal(manual.status, 200); assert.equal(manual.json.data.status, "PUBLISHED"); });
const denied = await api(`/api/content/${item.id}`, { method: "PATCH", cookie: other, body: { body: "Outro workspace" } });
check("marketing de outra organização protegido", () => assert.equal(denied.status, 403));
const meta = await api("/api/meta/connect", { cookie: owner });
check("Meta sem credenciais não inicia autorização falsa", () => assert.equal(meta.status, 503));
const removed = await api(`/api/chapter-blocks/${image.json.data.id}`, { method: "DELETE", cookie: owner });
check("imagem pode ser removida do capítulo", () => assert.equal(removed.status, 200));
const afterRemoval = await (await fetch(`${BASE}/products/${id}/export`, { headers: { cookie: owner } })).text(); assert.ok(!afterRemoval.includes(image.json.data.url));
console.log(`${checks} verificações passaram.`);
