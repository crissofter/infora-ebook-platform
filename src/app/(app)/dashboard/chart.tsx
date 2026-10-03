"use client";

import { BarChart } from "@/components/ui";

export function DashboardChart({ data }: { data: { day: string; count: number }[] }) {
  return <BarChart data={data} />;
}
