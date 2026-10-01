import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/users/config";
import { findOpenPasswordReset } from "@/lib/users/password-resets";

import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  // The token is in the URL: never send it to other sites as a Referer.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reset = await findOpenPasswordReset(token);

  if (!reset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This link can’t be used</CardTitle>
          <CardDescription>
            The link is invalid, has expired, was replaced by a newer one or has
            already been used. Ask an administrator for a new link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          For <strong>{reset.email}</strong>. This link works until{" "}
          {formatDateTime(reset.expires_at)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} email={reset.email} />
      </CardContent>
    </Card>
  );
}
