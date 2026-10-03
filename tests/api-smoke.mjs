/**
 * Integration smoke test against a running INFORA instance.
 *
 *   BASE_URL=http://127.0.0.1:3000 node tests/api-smoke.mjs
 *
 * Covers: health, signup, session, product generation, tenant isolation,
 * publication, public event tracking and logout.
 */
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
let failures = 0;

function check(name, cond, extra = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, cookie: res.headers.get("set-cookie") };
}

function sessionCookie(setCookie) {
  return setCookie ? setCookie.split(";")[0] : "";
}

const run = async () => {
  console.log(`INFORA smoke test → ${BASE}`);

  const health = await api("/api/health");
  check("health endpoint", health.status === 200 && health.json.status === "ok", JSON.stringify(health.json));

  const stamp = Date.now();
  const userA = { name: "Tester A", email: `a${stamp}@example.com`, password: "senha-forte-123", acceptTerms: true };
  const userB = { name: "Tester B", email: `b${stamp}@example.com`, password: "senha-forte-123", acceptTerms: true };

  const signupA = await api("/api/auth/signup", { method: "POST", body: userA });
  check("signup A", signupA.status === 200, JSON.stringify(signupA.json));
  const cookieA = sessionCookie(signupA.cookie);

  const signupB = await api("/api/auth/signup", { method: "POST", body: userB });
  const cookieB = sessionCookie(signupB.cookie);
  check("signup B", signupB.status === 200);

  const dup = await api("/api/auth/signup", { method: "POST", body: userA });
  check("e-mail duplicado bloqueado", dup.status === 409);

  const anon = await api("/api/products");
  check("rota protegida sem sessão", anon.status === 401);

  const created = await api("/api/products", {
    method: "POST",
    cookie: cookieA,
    body: {
      type: "EBOOK",
      idea: "E-book para casais melhorarem a comunicação",
      audience: "casais em relacionamento longo",
      objective: "melhorar o diálogo diário",
      problem: "discussões repetitivas",
      generate: true,
    },
  });
  check("criação + blueprint por IA", created.status === 201 && created.json.data?.generated, JSON.stringify(created.json).slice(0, 200));
  const productId = created.json.data?.product?.id;

  const detail = await api(`/api/products/${productId}`, { cookie: cookieA });
  check("blueprint gerou capítulos", (detail.json.data?.chapters?.length ?? 0) >= 8);

  const crossTenant = await api(`/api/products/${productId}`, { cookie: cookieB });
  check("isolamento multi-tenant", crossTenant.status === 403, `status ${crossTenant.status}`);

  const sales = await api(`/api/products/${productId}/generate`, { method: "POST", cookie: cookieA, body: { kind: "sales_page" } });
  check("geração da página de vendas", sales.status === 200 && Boolean(sales.json.data?.salesPage));

  const upgrade = await api("/api/billing/plan", { method: "POST", cookie: cookieA, body: { planCode: "CREATOR" } });
  check("upgrade de plano registrado", upgrade.status === 200 && upgrade.json.data?.plan?.code === "CREATOR");

  const marketing = await api(`/api/products/${productId}/generate`, { method: "POST", cookie: cookieA, body: { kind: "marketing" } });
  check("geração do pacote de marketing", marketing.status === 200 && (marketing.json.data?.items?.length ?? 0) >= 8);

  const cover = await api(`/api/products/${productId}/generate`, { method: "POST", cookie: cookieA, body: { kind: "cover" } });
  check("geração de capa", cover.status === 200 && String(cover.json.data?.asset?.payload ?? "").startsWith("<svg"));

  const exported = await api(`/api/products/${productId}/export`, { method: "POST", cookie: cookieA });
  check("exportação registrada", exported.status === 200);

  const published = await api(`/api/products/${productId}/sales-page`, { method: "PATCH", cookie: cookieA, body: { published: true } });
  check("publicação", published.status === 200 && published.json.data?.published === true);

  const detail2 = await api(`/api/products/${productId}`, { cookie: cookieA });
  const slug = detail2.json.data?.product?.slug;
  const pageView = await api("/api/public/events", { method: "POST", body: { slug, type: "page_view" } });
  check("evento público registrado", pageView.status === 200 && pageView.json.data?.recorded === true);

  const checkout = await api("/api/public/events", { method: "POST", body: { slug, type: "checkout_started" } });
  check("checkout sem gateway não simula venda", checkout.json.data?.checkout === "gateway_not_configured");

  const publicPage = await fetch(`${BASE}/s/${slug}`);
  check("página pública acessível", publicPage.status === 200);

  const logout = await api("/api/auth/logout", { method: "POST", cookie: cookieA });
  check("logout", logout.status === 200);

  console.log(failures === 0 ? "\nTodos os testes passaram." : `\n${failures} teste(s) falharam.`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
