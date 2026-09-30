import { z } from "zod";

/**
 * Public environment variables (safe for the browser).
 *
 * NEXT_PUBLIC_* variables must be referenced literally (process.env.X),
 * otherwise Next.js cannot inline them into the client bundle.
 * Server-only secrets are NOT defined here; see src/lib/supabase/admin.ts.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
