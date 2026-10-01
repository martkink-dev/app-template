import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/guards";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  // getCurrentUser, not getClaims: a deactivated user still has a valid JWT
  // for up to an hour. Checking claims here would send them back to the app,
  // the app would send them here, and so on.
  if (await getCurrentUser()) {
    redirect(safeRedirectPath(nextPath, "/dashboard"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use the email address your invitation was sent to.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* The server action validates `next` again; never trust it here. */}
        <LoginForm next={nextPath} />
      </CardContent>
    </Card>
  );
}
