import Link from "next/link";

import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

/** Header for public pages (src/app/(marketing)). */
export function SiteHeader() {
  return (
    <header className="border-b">
      <Container className="flex h-14 items-center justify-between">
        <Link href="/" className="font-heading font-semibold">
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Sign in
          </Link>
        </div>
      </Container>
    </header>
  );
}
