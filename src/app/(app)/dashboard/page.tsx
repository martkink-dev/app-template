import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The proxy already redirects signed-out users; the page checks again
  // because the proxy must not be the only protection.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=/dashboard");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of your account."
      />
      <EmptyState
        icon={Inbox}
        title="Nothing here yet"
        description="Items you create will show up here."
      />
    </>
  );
}
