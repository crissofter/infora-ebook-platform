import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { providerStatus } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;
  try {
    await db.execute(sql`select 1`);
    checks.database = "up";
  } catch {
    checks.database = "down";
    ok = false;
  }
  const ai = providerStatus();
  checks.aiProvider = ai.configured ? `configured:${ai.provider}` : "local-composer";
  checks.imageProvider = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY ? "configured:openai" : "not_configured";
  checks.paymentGateway = process.env.PAYMENT_PROVIDER ? "configured" : "not_configured";
  checks.socialIntegrations = process.env.META_APP_ID ? "configured" : "not_configured";

  return NextResponse.json(
    { status: ok ? "ok" : "degraded", service: "infora", version: "1.0.0", checks, timestamp: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
