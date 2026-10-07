import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { apiError, handler } from "@/lib/api";
import { graphRequest, metaConfig, requireMetaAdmin } from "@/lib/meta";
import { encryptMetaToken, verifyMetaState } from "@/lib/meta-security";

export const GET = handler(async (request) => {
  const { organization, user } = await requireMetaAdmin();
  const config = metaConfig();
  if (!config) return apiError("Integração Meta não configurada.", 503);
  const jar = await cookies();
  const [value, signature] = (jar.get("infora_meta_state")?.value ?? "").split(".");
  jar.delete({ name: "infora_meta_state", path: "/api/meta" });
  const query = new URL(request.url).searchParams;
  if (!value || !signature || !verifyMetaState(value, signature, config.appSecret)) return apiError("Autorização inválida. Inicie a conexão novamente.", 400);
  let state;
  try { state = JSON.parse(Buffer.from(value, "base64url").toString()); } catch { return apiError("Autorização inválida.", 400); }
  if (state.state !== query.get("state") || state.organizationId !== organization.id || state.userId !== user.id || state.expires < Date.now()) return apiError("Autorização inválida ou expirada.", 400);
  if (query.has("error")) return NextResponse.redirect(`${config.appUrl}/marketing?meta=cancelled`);
  const code = query.get("code");
  if (!code) return apiError("Código de autorização ausente.", 400);
  try {
    const short = await graphRequest("oauth/access_token", null, { client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code }, "POST");
    const long = await graphRequest("oauth/access_token", null, { grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: short.access_token }, "POST");
    if (!long.access_token) throw new Error("Authorization failed");
    const profile = await graphRequest("me", long.access_token, { fields: "id,name" });
    const permissions = await graphRequest("me/permissions", long.access_token);
    const scopes = (permissions.data ?? []).filter((p: { permission: string; status: string }) => p.status === "granted").map((p: { permission: string }) => p.permission);
    const values = { externalId: profile.id, displayName: profile.name, status: "CONNECTED", encryptedToken: encryptMetaToken(long.access_token, config.encryptionKey), scopes, connectedAt: new Date(), expiresAt: new Date(Date.now() + Math.min(Number(long.expires_in) || 3600, 60 * 86400) * 1000) };
    await db.insert(socialAccounts).values({ organizationId: organization.id, provider: "META", ...values }).onConflictDoUpdate({ target: [socialAccounts.organizationId, socialAccounts.provider], set: values });
    return NextResponse.redirect(`${config.appUrl}/marketing?meta=connected`);
  } catch { return NextResponse.redirect(`${config.appUrl}/marketing?meta=error`); }
});
