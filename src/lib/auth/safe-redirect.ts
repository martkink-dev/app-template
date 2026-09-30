/**
 * Returns `next` only if it is a relative path on this site; otherwise the
 * fallback. Prevents open redirects such as ?next=https://evil.example or
 * ?next=//evil.example.
 */
export function safeRedirectPath(next: unknown, fallback = "/") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
