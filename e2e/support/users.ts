import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/*
 * Test data helpers for E2E tests. They talk to the LOCAL Supabase with the
 * secret key, so tests can create the first admin (there is no sign-up page)
 * and clean up afterwards.
 *
 * Never point E2E tests at staging or production: the secret key bypasses RLS.
 */

/** Meets the password policy in src/lib/validations/password.ts. */
export const TEST_PASSWORD = "E2e-Test-Password-123!";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Locally it comes from .env.local; in CI from the "Use local Supabase for the app" step.`,
    );
  }
  return value;
}

function createAdminClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`E2E tests only run against local Supabase, not ${url}.`);
  }
  return createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A unique address per run, so reruns and parallel tests never collide. */
export function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
}

/**
 * Creates an active user directly, the same way an accepted invitation does
 * (src/app/(auth)/invite/[token]/actions.ts): create the Auth user, then set
 * the role on the profile.
 */
export async function createUser(email: string, role: "admin" | "member") {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", data.user.id);
  if (roleError) throw roleError;
}

/**
 * Deletes users and their invitations. Password reset links are removed by
 * cascade. Safe to call for missing users.
 */
export async function deleteUsers(emails: string[]) {
  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id")
    .in("email", emails);
  if (error) throw error;

  for (const { id } of profiles) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
    if (deleteError) throw deleteError;
  }

  const { error: invitationsError } = await supabase
    .from("invitations")
    .delete()
    .in("email", emails);
  if (invitationsError) throw invitationsError;
}
