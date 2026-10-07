"use client";

import { Button } from "@/components/ui";
import { useState } from "react";

export function PrintButton() {
  const [busy, setBusy] = useState(false);
  async function print() {
    setBusy(true);
    try {
      await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
      window.print();
    } finally { setBusy(false); }
  }
  return (
    <Button size="sm" loading={busy} onClick={print}>
      Salvar como PDF
    </Button>
  );
}
