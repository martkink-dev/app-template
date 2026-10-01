import { z } from "zod";

import { passwordSchema } from "@/lib/validations/password";

export const APP_ROLES = ["admin", "member"] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Email is the username: trimmed and stored in lowercase. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));

export const roleSchema = z.enum(APP_ROLES, "Choose a valid role.");

export const userIdSchema = z.uuid("Invalid user.");

export const invitationIdSchema = z.uuid("Invalid invitation.");

/**
 * Token in invitation and password reset links: base64url of 32 bytes.
 * (The name predates password resets; both links use the same format.)
 */
export const invitationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid link.");

export const createInvitationSchema = z.object({
  email: emailSchema,
  role: roleSchema,
});

/** A token from a link plus a new password, typed twice. */
const tokenWithNewPasswordSchema = z
  .object({
    token: invitationTokenSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export const acceptInvitationSchema = tokenWithNewPasswordSchema;

export const resetPasswordSchema = tokenWithNewPasswordSchema;

export const signInSchema = z.object({
  email: emailSchema,
  // No policy check on sign-in: only "is it filled in".
  password: z.string().min(1, "Enter your password."),
});
