import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/guards";

/**
 * App shell for the signed-in area: sidebar on desktop, top bar on mobile.
 *
 * requireUser() here is for the shell (nav and the signed-in user), not for
 * protection: layouts are not re-rendered on every navigation, so every page
 * and Server Action must still call requireUser() or requireAdmin() itself.
 * getCurrentUser() is cached per request, so this costs no extra query.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b bg-sidebar text-sidebar-foreground md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link
            href="/dashboard"
            className="truncate font-heading font-semibold"
          >
            {siteConfig.name}
          </Link>
          <div className="flex shrink-0 items-center">
            <ThemeToggle />
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label={`Sign out (${user.email})`}
                title={`Sign out (${user.email})`}
              >
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </div>
        <AppNav isAdmin={user.role === "admin"} />
      </aside>
      <main className="flex-1">
        <Container className="py-8">{children}</Container>
      </main>
    </div>
  );
}
