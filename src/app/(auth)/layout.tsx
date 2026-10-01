import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/config/site";

/**
 * Centred frame for signed-out pages: sign in and accepting an invitation.
 *
 * Accounts are created only from invitations. Do not add a sign-up page
 * here (see AGENTS.md, "Authentication model").
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-heading font-semibold">
          {siteConfig.name}
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
