import assert from "node:assert/strict";
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const connectionString = process.env.DATABASE_URL ?? "postgresql://agent@127.0.0.1:5432/infora";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname) || !["localhost", "127.0.0.1"].includes(new URL(connectionString).hostname)) throw new Error("Execute somente no banco local de desenvolvimento.");
async function api(path, method = "GET", body, cookie) {
  const response = await fetch(BASE + path, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, json: await response.json(), cookie: (response.headers.get("set-cookie") ?? "").split(";")[0] };
}
const email = `security-${Date.now()}@example.com`;
const password = "senha-sintetica-123";
const signup = await api("/api/auth/signup", "POST", { name: "Teste de Segurança", email, password, acceptTerms: true });
assert.equal(signup.status, 200);
const session2 = await api("/api/auth/login", "POST", { email, password });
const changed = await api("/api/account", "PATCH", { currentPassword: password, newPassword: "senha-nova-sintetica-123" }, signup.cookie);
assert.equal(changed.status, 200);
assert.equal((await api("/api/account", "GET", undefined, session2.cookie)).status, 401);
assert.equal((await api("/api/account", "GET", undefined, changed.cookie)).status, 200);
console.log("ok troca de senha revoga sessões antigas e renova a atual");
for (const address of [email, `unknown-${Date.now()}@example.com`]) {
  const reset = await api("/api/auth/password", "POST", { email: address });
  assert.equal(reset.status, 503); assert.equal(reset.json.code, "EMAIL_DELIVERY_NOT_CONFIGURED"); assert.ok(!reset.json.data?.token);
}
console.log("ok recuperação não expõe tokens nem informa existência da conta");
const pool = new pg.Pool({ connectionString });
const { userId, organizationId } = signup.json.data;
try {
  await pool.query("INSERT INTO social_accounts (organization_id,provider,status,encrypted_token) VALUES ($1,'META','CONNECTED','synthetic-encrypted-token')", [organizationId]);
  await pool.query("INSERT INTO notifications (organization_id,user_id,title) VALUES ($1,$2,'Notificação de teste')", [organizationId, userId]);
  await pool.query("INSERT INTO password_resets (user_id,token_hash,expires_at) VALUES ($1,'synthetic-hash',now()+interval '10 minutes')", [userId]);
  const deleted = await api("/api/account", "DELETE", undefined, changed.cookie);
  assert.equal(deleted.status, 200);
  for (const table of ["social_accounts", "notifications", "subscriptions", "usage_limits", "ai_generations", "ai_usage", "chapter_blocks", "memberships"]) {
    const result = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE organization_id=$1`, [organizationId]); assert.equal(result.rows[0].n, 0, table);
  }
  for (const table of ["password_resets", "sessions"]) {
    const result = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id=$1`, [userId]); assert.equal(result.rows[0].n, 0, table);
  }
  console.log("ok exclusão remove credenciais Meta e registros vinculados à conta");
} finally { await pool.end(); }
