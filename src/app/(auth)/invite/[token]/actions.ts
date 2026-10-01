"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/users/tokens";
import { acceptInvitationSchema } from "@/lib/validations/users";

export type AcceptInvitationState = { error?: string };

const GENERIC_ERROR = "Something went wrong. Try again.";
const INVALID_INVITATION =
  "This invitation link is invalid, has expired or has already been used. Ask an administrator for a new one.";

export async function acceptInvitation(
  _prevState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const parsed = acceptInvitationSchema.safeParse({
    token: formData.get("token") ?? "",
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input." };
  }
  const { token, password } = parsed.data;

  // Admin client: the visitor has no account or session yet, and creating
  // an Auth user requires the secret key. The token is the authorisation.
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Claim the invitation atomically: of two simultaneous requests with the
  // same link, only one gets a row back.
  const { data: invitation, error: claimError } = await admin
    .from("invitations")
    .update({ accepted_at: now })
    .eq("token_hash", hashInvitationToken(token))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .select("id, email, role")
    .maybeSingle();

  if (claimError) {
    console.error("acceptInvitation: claim failed", claimError);
    return { error: GENERIC_ERROR };
  }
  if (!invitation) return { error: INVALID_INVITATION };

  // Releases the claim so the link can be used again after a failure.
  async function releaseClaim(invitationId: string) {
    await admin
      .from("invitations")
      .update({ accepted_at: null })
      .eq("id", invitationId);
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: invitation.email,
      password,
      // The invitation link proves the person received it from an admin.
      email_confirm: true,
    });

  if (createError) {
    await releaseClaim(invitation.id);

    if (createError.code === "weak_password") {
      return { error: "This password is too weak. Choose a stronger one." };
    }
    if (createError.code === "email_exists") {
      return {
        error: "An account with this email already exists. Sign in instead.",
      };
    }
    console.error("acceptInvitation: createUser failed", createError);
    return { error: GENERIC_ERROR };
  }

  // public.handle_new_user() creates every profile as 'member'. The role is
  // set here, not through app_metadata: Supabase Auth writes app_metadata
  // after inserting the user, so the trigger never sees it. Users cannot
  // write profiles.role themselves (column grants), hence the admin client.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: invitation.role })
    .eq("id", created.user.id);

  if (roleError) {
    // Undo the account so the invitation can be accepted again with the
    // right role, rather than leaving a user with the wrong one.
    console.error("acceptInvitation: setting role failed", roleError);
    await admin.auth.admin.deleteUser(created.user.id);
    await releaseClaim(invitation.id);
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invitation.email,
    password,
  });

  // The account exists either way; if automatic sign-in fails, the user
  // signs in manually.
  redirect(signInError ? "/login" : "/dashboard");
}
