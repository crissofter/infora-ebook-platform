import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth";
import { logSystem } from "@/lib/logger";

/** Friendly, non-technical error payload. Technical detail goes to logs. */
export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: message, code: code ?? null }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ZodError([]);
  }
  return schema.parse(json);
}

/** Wraps a route handler with uniform error handling + logging. */
export function handler(fn: (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (request: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(request, ctx);
    } catch (error) {
      if (error instanceof AuthError) {
        return apiError(
          error.status === 403 ? "Você não tem permissão para esta ação." : "Sua sessão expirou. Entre novamente.",
          error.status,
          error.message,
        );
      }
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return apiError(first ? `Dados inválidos: ${first.path.join(".") || "payload"}` : "Dados inválidos.", 422, "VALIDATION");
      }
      await logSystem("error", "api", error instanceof Error ? error.message : "unknown error", {
        stack: error instanceof Error ? error.stack?.slice(0, 2000) : undefined,
        url: request.url,
      });
      return apiError("Não conseguimos concluir esta operação agora. Tente novamente.", 500, "INTERNAL");
    }
  };
}

/** Simple in-memory rate limiter (per process). Good enough for a single-node MVP. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const nowMs = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: limit - bucket.count };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
