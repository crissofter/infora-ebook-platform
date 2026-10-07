import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { requireSession, AuthError } from "@/lib/auth";
import { decryptMetaToken } from "./meta-security";

export const META_SCOPES = ["ads_management", "ads_read", "pages_show_list", "pages_read_engagement", "instagram_basic"];

export function metaConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const encryptionKey = process.env.META_TOKEN_ENCRYPTION_KEY;
  const appUrl = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  if (!appId || !appSecret || !encryptionKey || Buffer.from(encryptionKey, "base64").length !== 32 || !/^https:\/\//.test(appUrl) || !/^v\d+\.\d+$/.test(version)) return null;
  return { appId, appSecret, encryptionKey, version, appUrl: appUrl.replace(/\/$/, ""), redirectUri: `${appUrl.replace(/\/$/, "")}/api/meta/callback` };
}

export async function requireMetaAdmin() {
  const session = await requireSession();
  if (!["OWNER", "ADMIN"].includes(session.membershipRole)) { const error = new AuthError("FORBIDDEN"); error.status = 403; throw error; }
  return session;
}

export async function graphRequest(path: string, token: string | null, params: Record<string, string> = {}, method = "GET") {
  const config = metaConfig();
  if (!config) throw new Error("Configure as credenciais da integração Meta na hospedagem.");
  const url = new URL(`https://graph.facebook.com/${config.version}/${path}`);
  const body = new URLSearchParams(params);
  if (method === "GET") url.search = body.toString();
  const response = await fetch(url, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, ...(method === "POST" ? { body } : {}), signal: AbortSignal.timeout(20_000), cache: "no-store" });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error("A Meta não autorizou a operação. Verifique as permissões e reconecte sua conta.");
  return data;
}

export async function connectedMeta(organizationId: string) {
  const config = metaConfig();
  if (!config) throw new Error("Integração Meta não configurada na hospedagem.");
  const [account] = await db.select().from(socialAccounts).where(and(eq(socialAccounts.organizationId, organizationId), eq(socialAccounts.provider, "META"), eq(socialAccounts.status, "CONNECTED"))).limit(1);
  if (!account?.encryptedToken || !account.expiresAt || account.expiresAt <= new Date()) throw new Error("Conecte novamente sua conta Meta.");
  return { account, token: decryptMetaToken(account.encryptedToken, config.encryptionKey) };
}
