import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

/** Public home page. Replace the content for each app. */
export default function HomePage() {
  return (
    <Container className="flex flex-1 flex-col justify-center py-24">
      <div className="max-w-2xl space-y-6">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {siteConfig.description}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Open the app
          </Link>
        </div>
      </div>
    </Container>
  );
}
