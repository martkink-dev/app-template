import { z } from "zod";

import { passwordSchema } from "@/lib/validations/password";
import { updateProfileSchema } from "@/lib/validations/profile";

/** The account page edits only the display name. */
export const updateDisplayNameSchema = updateProfileSchema.pick({
  display_name: true,
});

/** Changing your own password while signed in. */
export const changePasswordSchema = z
  .object({
    // No policy check: the current password may predate the policy.
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The new passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a password different from your current one.",
    path: ["newPassword"],
  });
