import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Invitation tokens: 32 random bytes, base64url encoded (43 characters).
 * Only the SHA-256 hash is stored in the database, so a database leak does
 * not reveal usable invitation links.
 *
 * scripts/invite-admin.mjs uses the same format; keep them in sync.
 */
export function generateInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
