import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken } from "@/lib/users/tokens";
import { invitationTokenSchema } from "@/lib/validations/users";

/**
 * Finds an open (not used, not revoked, not expired) password reset link by
 * its plain token, for an active user. Returns null for anything else.
 *
 * Uses the admin client because the visitor is not signed in: that is why
 * they need the link. Only the email and expiry are returned.
 */
export async function findOpenPasswordReset(token: string) {
  const parsed = invitationTokenSchema.safeParse(token);
  if (!parsed.success) return null;

  const supabase = createAdminClient();
  const { data: reset, error } = await supabase
    .from("password_resets")
    .select("user_id, expires_at")
    .eq("token_hash", hashInvitationToken(parsed.data))
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("findOpenPasswordReset failed", error);
    return null;
  }
  if (!reset) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, status")
    .eq("id", reset.user_id)
    .maybeSingle();

  if (profileError) {
    console.error("findOpenPasswordReset: profile lookup failed", profileError);
    return null;
  }
  // Deactivated users cannot use reset links; they must be activated first.
  if (!profile || profile.status !== "active") return null;

  return { email: profile.email, expires_at: reset.expires_at };
}
