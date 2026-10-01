import { LayoutDashboard, type LucideIcon, Users } from "lucide-react";

/**
 * App identity. Change these values when starting a new app.
 * Used for page titles, the header and the <html lang> attribute.
 */
export const siteConfig = {
  name: "App Template",
  description: "A starting point for web apps built with Next.js and Supabase.",
  locale: "en",
} as const;

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /**
   * Shown only to admins. This only hides the link: the page itself must
   * still call requireAdmin().
   */
  adminOnly?: boolean;
};

/** Navigation for the signed-in area (src/app/(app)). */
export const appNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users, adminOnly: true },
];
