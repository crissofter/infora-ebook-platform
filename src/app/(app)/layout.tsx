import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { getSession, isPlatformAdmin } from "@/lib/auth";
import { getUsage } from "@/lib/billing";
import { providerStatus } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { user, organization } = session;
  const usage = await getUsage(organization.id, organization.planCode);
  const notes = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.organizationId, organization.id), isNull(notifications.readAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(6);

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      organization={{ name: organization.name, planCode: organization.planCode }}
      credits={{ used: usage.creditsUsed, included: usage.creditsIncluded }}
      isAdmin={isPlatformAdmin(user.role)}
      aiConfigured={providerStatus().configured}
      notifications={notes.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        level: n.level,
        createdAt: n.createdAt.toISOString(),
      }))}
    >
      {children}
    </AppShell>
  );
}
