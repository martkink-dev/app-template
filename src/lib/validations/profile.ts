import { z } from "zod";

/** Input for updating the signed-in user's own profile (public.profiles). */
export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters"),
  // Only http(s): rejects javascript:, data: and other unsafe schemes.
  avatar_url: z
    .url({ protocol: /^https?$/ })
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
