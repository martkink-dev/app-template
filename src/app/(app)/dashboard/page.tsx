import { Inbox } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The proxy and the layout are not the protection; the page checks itself.
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user.email}.`}
      />
      <EmptyState
        icon={Inbox}
        title="Nothing here yet"
        description="Items you create will show up here."
      />
    </>
  );
}
