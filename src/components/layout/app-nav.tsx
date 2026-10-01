"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appNav } from "@/config/site";
import { cn } from "@/lib/utils";

type AppNavProps = {
  /** Decided on the server (getCurrentUser); controls adminOnly items. */
  isAdmin: boolean;
};

/**
 * Main navigation of the signed-in area. Horizontal on mobile,
 * vertical in the sidebar from the md breakpoint up.
 *
 * The items are imported here rather than passed as props, because their
 * icons are components and cannot be sent from a Server Component.
 */
export function AppNav({ isAdmin }: AppNavProps) {
  const pathname = usePathname();
  const items = appNav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav
      aria-label="Main"
      className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4"
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
