/**
 * User management settings. Adjust per app.
 */

/** How long an invitation link stays valid. */
export const INVITATION_TTL_HOURS = 72;

/**
 * How long a password reset link stays valid. Shorter than an invitation:
 * it gives access to an existing account.
 */
export const PASSWORD_RESET_TTL_HOURS = 24;

/**
 * Ban length used to deactivate a user in Supabase Auth.
 * A banned user cannot sign in or refresh a session. "876000h" = ~100 years.
 */
export const DEACTIVATION_BAN_DURATION = "876000h";

/** Locale and time zone for dates shown in the admin UI. */
export const DISPLAY_LOCALE = "en-GB";
export const DISPLAY_TIME_ZONE = "Europe/Tallinn";

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}
