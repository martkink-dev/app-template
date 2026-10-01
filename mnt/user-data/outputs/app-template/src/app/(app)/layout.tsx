import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/config/site";

/**
 * App shell for the signed-in area: sidebar on desktop, top bar on mobile.
 * This layout is UI only. Every page still checks the user itself
 * (see docs/checklists/security.md).
 */
export default function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b bg-sidebar text-sidebar-foreground md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="font-heading font-semibold">
            {siteConfig.name}
          </Link>
          <ThemeToggle />
        </div>
        <AppNav />
      </aside>
      <main className="flex-1">
        <Container className="py-8">{children}</Container>
      </main>
    </div>
  );
}
