import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client with the SECRET key. BYPASSES Row Level Security.
 *
 * Use only in trusted server code (webhooks, cron jobs, admin tasks),
 * never for normal user requests. The "server-only" import makes the
 * build fail if this file is ever imported into client code.
 */
export function createAdminClient() {
  const secretKey = z
    .string()
    .min(1, "SUPABASE_SECRET_KEY is not set")
    .parse(process.env.SUPABASE_SECRET_KEY);

  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
