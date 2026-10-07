"use client";

import { useEffect } from "react";
import { formatCurrency } from "@/lib/slug";
import { safeCheckoutUrl } from "@/lib/media";

async function track(slug: string, type: string, extra?: Record<string, unknown>) {
  try {
    await fetch("/api/public/events", {
      method: "POST",
      keepalive: true,
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

export function SalesCta({ slug, label, price, currency, checkoutUrl }: { slug: string; label: string; price: number; currency: string; checkoutUrl: string | null }) {
  const enabled = !!checkoutUrl && safeCheckoutUrl(checkoutUrl);
  return <div className="flex flex-col items-center gap-3">
    {enabled ? <a href={checkoutUrl!} rel="noopener noreferrer" onClick={() => { void track(slug, "cta_clicked"); void track(slug, "checkout_started"); }} className="rounded-[10px] bg-[#4f7cff] px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#3f66e0]">
      {label}{price > 0 ? ` · ${formatCurrency(price, currency)}` : ""}
    </a> : <><button disabled className="rounded-[10px] bg-[#171b24] px-8 py-3.5 text-sm text-[#a5adbd]">Compra em breve</button><p className="text-xs text-[#a5adbd]">O vendedor está preparando o pagamento deste produto.</p></>}
  </div>;
}
