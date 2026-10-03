"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/slug";

async function track(slug: string, type: string, extra?: Record<string, unknown>) {
  try {
    await fetch("/api/public/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, type, source: document.referrer ? new URL(document.referrer).hostname : "direct", ...extra }),
    });
  } catch {
    /* tracking must never break the page */
  }
}

export function SalesPageTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track(slug, "page_view");
  }, [slug]);
  return null;
}

export function SalesCta({
  slug,
  label,
  price,
  currency,
}: {
  slug: string;
  label: string;
  price: number;
  currency: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "pending">("idle");

  async function onClick() {
    setState("loading");
    await track(slug, "cta_clicked");
    await track(slug, "checkout_started");
    setState("pending");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onClick}
        disabled={state === "loading"}
        className="rounded-[10px] bg-[#4f7cff] px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#3f66e0] disabled:opacity-60"
      >
        {label}
        {price > 0 ? ` · ${formatCurrency(price, currency)}` : ""}
      </button>
      {state === "pending" ? (
        <p className="max-w-sm rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-[11px] leading-relaxed text-amber-200">
          Checkout ainda não configurado por este vendedor. Seu interesse foi registrado e nenhuma cobrança foi feita.
        </p>
      ) : null}
    </div>
  );
}
