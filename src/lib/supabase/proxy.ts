import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Routes reachable without a session. Everything else requires sign-in
 * (secure by default). Adjust per app.
 *
 * /invite: invitation links are opened by people who have no account yet.
 */
const PUBLIC_PATHS = ["/", "/login", "/auth", "/invite"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Refreshes the Supabase auth session on every matched request and
 * redirects unauthenticated users away from protected routes.
 * Called from src/proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any code between createServerClient and
  // getClaims(). getClaims() verifies the JWT signature; never rely on
  // getSession() in server code.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  if (!isSignedIn && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return this response object as-is. If you create a new
  // response, copy its cookies over, or the session will be lost.
  return response;
}
