import { z } from "zod";

/**
 * Password policy. Must match supabase/config.toml ([auth]) and the hosted
 * Auth settings in Supabase:
 *   minimum_password_length = 12
 *   password_requirements   = "lower_upper_letters_digits_symbols"
 *
 * Supabase Auth enforces the same rules on the server; this schema gives
 * clear messages before the request is sent.
 */
export const PASSWORD_MIN_LENGTH = 12;

/** bcrypt, used by Supabase Auth, only reads the first 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;

/** The symbol set Supabase Auth accepts for "symbols". */
const SYMBOL_PATTERN = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export const PASSWORD_RULES = [
  `At least ${PASSWORD_MIN_LENGTH} characters`,
  "A lowercase and an uppercase letter",
  "A number",
  `A symbol, for example ! @ # $ % & * ?`,
] as const;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`)
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(SYMBOL_PATTERN, "Add a symbol, for example ! @ # $ % & * ?");
