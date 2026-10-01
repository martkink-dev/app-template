"use server";

import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validations/users";

/** Where users land after signing in when there is no valid `next`. */
const AFTER_SIGN_IN_PATH = "/dashboard";

export type SignInState = { error?: string };

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // One message for wrong password, unknown email and deactivated
    // (banned) accounts, so the form does not reveal which accounts exist.
    return {
      error:
        "Sign-in failed. Check your email and password. If your account has been deactivated, contact an administrator.",
    };
  }

  redirect(safeRedirectPath(formData.get("next"), AFTER_SIGN_IN_PATH));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
