"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEACTIVATION_BAN_DURATION,
  INVITATION_TTL_HOURS,
} from "@/lib/users/config";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "@/lib/users/tokens";
import {
  createInvitationSchema,
  invitationIdSchema,
  roleSchema,
  userIdSchema,
} from "@/lib/validations/users";

/*
 * Admin actions for user management.
 *
 * Every action starts with requireAdmin(). Invitations are created and
 * revoked with the admin's own session, so RLS applies as a second check.
 * Changes to users (role, status, deletion) need the Supabase Auth admin API
 * or columns users may not write, so they use the admin client (secret key)
 * and run only after requireAdmin() has passed.
 *
 * Admins cannot change their own account here. Because the acting admin is
 * always active, this also guarantees that at least one active admin remains.
 */

const USERS_PATH = "/admin/users";
const GENERIC_ERROR = "Something went wrong. Try again.";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type CreateInvitationState = {
  error?: string;
  invitation?: { email: string; link: string; expiresAt: string };
};

async function getSiteOrigin() {
  const headerList = await headers();
  // Browsers send Origin with every Server Action request.
  const origin = headerList.get("origin");
  if (origin) return origin;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function createInvitation(
  _prevState: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const currentAdmin = await requireAdmin();

  const parsed = createInvitationSchema.safeParse({
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input." };
  }
  const { email, role } = parsed.data;

  const supabase = await createClient();

  const { data: existingUser, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    console.error("createInvitation: lookup failed", lookupError);
    return { error: GENERIC_ERROR };
  }
  if (existingUser) {
    return { error: "A user with this email already exists." };
  }

  const now = new Date();

  // Only one open invitation per email: a new invitation replaces the old one.
  const { error: revokeError } = await supabase
    .from("invitations")
    .update({ revoked_at: now.toISOString() })
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (revokeError) {
    console.error("createInvitation: revoke previous failed", revokeError);
    return { error: GENERIC_ERROR };
  }

  const token = generateInvitationToken();
  const expiresAt = new Date(
    now.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { error: insertError } = await supabase.from("invitations").insert({
    email,
    role,
    token_hash: hashInvitationToken(token),
    expires_at: expiresAt,
    invited_by: currentAdmin.id,
  });
  if (insertError) {
    console.error("createInvitation: insert failed", insertError);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(USERS_PATH);

  // The plain token is returned once and never stored.
  return {
    invitation: {
      email,
      link: `${await getSiteOrigin()}/invite/${token}`,
      expiresAt,
    },
  };
}

export async function revokeInvitation(
  invitationId: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = invitationIdSchema.safeParse(invitationId);
  if (!parsed.success) return { ok: false, error: "Invalid invitation." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (error) {
    console.error("revokeInvitation failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}

/** Validates the target user id and blocks actions on the admin's own account. */
async function prepareUserAction(
  userId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const currentAdmin = await requireAdmin();

  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid user." };

  if (parsed.data === currentAdmin.id) {
    return {
      ok: false,
      error: "You can’t change your own account. Ask another administrator.",
    };
  }

  return { ok: true, userId: parsed.data };
}

export async function deactivateUser(userId: string): Promise<ActionResult> {
  const prepared = await prepareUserAction(userId);
  if (!prepared.ok) return prepared;

  const admin = createAdminClient();

  // Ban first: this is what actually stops sign-in and session refresh.
  const { error: banError } = await admin.auth.admin.updateUserById(
    prepared.userId,
    { ban_duration: DEACTIVATION_BAN_DURATION },
  );
  if (banError) {
    console.error("deactivateUser: ban failed", banError);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Status blocks the remaining lifetime of any issued access token
  // (see getCurrentUser) and is shown in the UI.
  const { error } = await admin
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", prepared.userId);
  if (error) {
    console.error("deactivateUser: status update failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}

export async function reactivateUser(userId: string): Promise<ActionResult> {
  const prepared = await prepareUserAction(userId);
  if (!prepared.ok) return prepared;

  const admin = createAdminClient();

  const { error: unbanError } = await admin.auth.admin.updateUserById(
    prepared.userId,
    { ban_duration: "none" },
  );
  if (unbanError) {
    console.error("reactivateUser: unban failed", unbanError);
    return { ok: false, error: GENERIC_ERROR };
  }

  const { error } = await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", prepared.userId);
  if (error) {
    console.error("reactivateUser: status update failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: string,
): Promise<ActionResult> {
  const prepared = await prepareUserAction(userId);
  if (!prepared.ok) return prepared;

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "Invalid role." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: parsedRole.data })
    .eq("id", prepared.userId);
  if (error) {
    console.error("setUserRole failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const prepared = await prepareUserAction(userId);
  if (!prepared.ok) return prepared;

  const admin = createAdminClient();

  // Deletes the Auth user permanently; the profile is removed by
  // "on delete cascade". Other tables that reference the user must use
  // "on delete cascade" or "on delete set null", otherwise this fails.
  const { error } = await admin.auth.admin.deleteUser(prepared.userId);
  if (error) {
    console.error("deleteUser failed", error);
    return {
      ok: false,
      error:
        "The user could not be deleted. They may still own data in the app; deactivate them instead.",
    };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}
