import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken } from "@/lib/users/tokens";
import { invitationTokenSchema } from "@/lib/validations/users";

/**
 * Finds an open (not accepted, not revoked, not expired) invitation by its
 * plain token. Returns null for anything else.
 *
 * Uses the admin client because the visitor has no session yet: they are
 * about to create their account. Only the email and expiry are returned.
 */
export async function findOpenInvitation(token: string) {
  const parsed = invitationTokenSchema.safeParse(token);
  if (!parsed.success) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("email, expires_at")
    .eq("token_hash", hashInvitationToken(parsed.data))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("findOpenInvitation failed", error);
    return null;
  }

  return data;
}
