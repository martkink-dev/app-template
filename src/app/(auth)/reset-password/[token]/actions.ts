"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/users/tokens";
import { resetPasswordSchema } from "@/lib/validations/users";

export type ResetPasswordState = { error?: string };

const GENERIC_ERROR = "Something went wrong. Try again.";
const INVALID_LINK =
  "This link is invalid, has expired or has already been used. Ask an administrator for a new one.";

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token") ?? "",
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input." };
  }
  const { token, password } = parsed.data;

  // Admin client: the visitor is not signed in, and changing another user's
  // password requires the secret key. The token is the authorisation.
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Claim the link atomically: of two simultaneous requests with the same
  // link, only one gets a row back.
  const { data: reset, error: claimError } = await admin
    .from("password_resets")
    .update({ used_at: now })
    .eq("token_hash", hashInvitationToken(token))
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .select("id, user_id")
    .maybeSingle();

  if (claimError) {
    console.error("resetPassword: claim failed", claimError);
    return { error: GENERIC_ERROR };
  }
  if (!reset) return { error: INVALID_LINK };

  const resetId = reset.id;
  async function releaseClaim() {
    await admin
      .from("password_resets")
      .update({ used_at: null })
      .eq("id", resetId);
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email, status")
    .eq("id", reset.user_id)
    .maybeSingle();

  if (profileError) {
    console.error("resetPassword: profile lookup failed", profileError);
    await releaseClaim();
    return { error: GENERIC_ERROR };
  }
  // A deactivated user cannot regain access with a reset link.
  if (!profile || profile.status !== "active") return { error: INVALID_LINK };

  const { error: updateError } = await admin.auth.admin.updateUserById(
    reset.user_id,
    { password },
  );

  if (updateError) {
    await releaseClaim();
    if (updateError.code === "weak_password") {
      return { error: "This password is too weak. Choose a stronger one." };
    }
    if (updateError.code === "same_password") {
      return { error: "Choose a password you haven’t used for this account." };
    }
    console.error("resetPassword: password update failed", updateError);
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  // The new password is set either way; if automatic sign-in fails, the user
  // signs in manually.
  redirect(signInError ? "/login" : "/dashboard");
}
