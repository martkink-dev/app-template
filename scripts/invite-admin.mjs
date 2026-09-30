// Creates an ADMIN invitation and prints the link.
// Used to create the first admin of an app, or to regain access if no
// admin can sign in. Runs with the secret key, so run it only on your own
// computer.
//
// Usage:
//   npm run users:invite-admin -- you@example.com
//   node --env-file=<env file> scripts/invite-admin.mjs you@example.com https://app.example.com
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the env file.
// Token format and TTL must match src/lib/users/tokens.ts and
// src/lib/users/config.ts.

import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const INVITATION_TTL_HOURS = 72;

const [rawEmail, siteUrl = "http://localhost:3000"] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: invite-admin.mjs <email> [site-url]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existingUser, error: lookupError } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", email)
  .maybeSingle();
if (lookupError) throw lookupError;
if (existingUser) {
  console.error(`A user with the email ${email} already exists.`);
  process.exit(1);
}

const now = new Date();

const { error: revokeError } = await supabase
  .from("invitations")
  .update({ revoked_at: now.toISOString() })
  .eq("email", email)
  .is("accepted_at", null)
  .is("revoked_at", null);
if (revokeError) throw revokeError;

const token = randomBytes(32).toString("base64url");
const expiresAt = new Date(now.getTime() + INVITATION_TTL_HOURS * 3600 * 1000);

const { error: insertError } = await supabase.from("invitations").insert({
  email,
  role: "admin",
  token_hash: createHash("sha256").update(token).digest("hex"),
  expires_at: expiresAt.toISOString(),
});
if (insertError) throw insertError;

console.log(
  `Admin invitation for ${email} (valid until ${expiresAt.toISOString()}):`,
);
console.log(`${siteUrl.replace(/\/$/, "")}/invite/${token}`);
