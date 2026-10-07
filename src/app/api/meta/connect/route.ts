import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiError, handler } from "@/lib/api";
import { metaConfig, META_SCOPES, requireMetaAdmin } from "@/lib/meta";
import { signMetaState } from "@/lib/meta-security";

export const GET = handler(async () => {
  const { organization, user } = await requireMetaAdmin();
  const config = metaConfig();
  if (!config) return apiError("Configure META_APP_ID, META_APP_SECRET, META_TOKEN_ENCRYPTION_KEY e APP_URL na hospedagem.", 503);
  const state = randomBytes(32).toString("base64url");
  const value = Buffer.from(JSON.stringify({ state, organizationId: organization.id, userId: user.id, expires: Date.now() + 600_000 })).toString("base64url");
  (await cookies()).set("infora_meta_state", `${value}.${signMetaState(value, config.appSecret)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/meta", maxAge: 600 });
  const url = new URL(`https://www.facebook.com/${config.version}/dialog/oauth`);
  url.search = new URLSearchParams({ client_id: config.appId, redirect_uri: config.redirectUri, state, scope: META_SCOPES.join(","), response_type: "code" }).toString();
  return NextResponse.redirect(url);
});
