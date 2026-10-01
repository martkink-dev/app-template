"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  updateDisplayNameSchema,
} from "@/lib/validations/account";

export type AccountFormState = { ok?: boolean; error?: string };

const GENERIC_ERROR = "Something went wrong. Try again.";

export async function updateDisplayName(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();

  const parsed = updateDisplayNameSchema.safeParse({
    display_name: formData.get("display_name") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input." };
  }

  // The user's own session: RLS and column grants allow exactly this update.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.display_name })
    .eq("id", user.id);

  if (error) {
    console.error("updateDisplayName failed", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/account");
  return { ok: true };
}

export async function changePassword(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input." };
  }
  const { currentPassword, newPassword } = parsed.data;

  // Check the current password first, so a session left open on a shared
  // computer cannot be used to take over the account. A separate client
  // without cookies: the user's own session is not touched. Supabase's
  // sign-in rate limit also applies here.
  const verifier = createStatelessClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: "Your current password is incorrect." };
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    if (updateError.code === "weak_password") {
      return { error: "This password is too weak. Choose a stronger one." };
    }
    if (updateError.code === "same_password") {
      return { error: "Choose a password different from your current one." };
    }
    // Happens if "Secure password change" is enabled in Supabase Auth: it
    // needs an emailed code, and this app sends no emails. Keep it off.
    if (updateError.code === "reauthentication_needed") {
      console.error("changePassword: secure password change is enabled");
    } else {
      console.error("changePassword: update failed", updateError);
    }
    return { error: GENERIC_ERROR };
  }

  // End the user's sessions on other devices (and the one the check above
  // created). This session stays signed in.
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "others",
  });
  if (signOutError) {
    console.error(
      "changePassword: signing out other sessions failed",
      signOutError,
    );
  }

  return { ok: true };
}
