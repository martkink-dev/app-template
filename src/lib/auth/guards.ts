import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: AppRole;
};

/**
 * Returns the signed-in, active user, or null.
 *
 * Checks profiles.status as well as the JWT: a deactivated user is banned in
 * Supabase Auth, but an access token issued before the ban stays valid until
 * it expires (jwt_expiry, 1 hour by default). This check closes that gap.
 *
 * Cached per request, so calling it from a layout and a page costs one query.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.status !== "active") return null;

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
  };
});

/** For pages and Server Actions that need a signed-in, active user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * For admin pages and Server Actions. Non-admins get a 404 so the admin area
 * is not revealed.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
