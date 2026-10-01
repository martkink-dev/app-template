import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";

/** Layout for public pages: header, content, footer. */
export default function MarketingLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t">
        <Container className="py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}
        </Container>
      </footer>
    </>
  );
}
