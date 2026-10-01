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
import { findOpenInvitation } from "@/lib/users/invitations";

import { AcceptInvitationForm } from "./accept-form";

export const metadata: Metadata = {
  title: "Accept invitation",
  // The token is in the URL: never send it to other sites as a Referer.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await findOpenInvitation(token);

  if (!invitation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This invitation can’t be used</CardTitle>
          <CardDescription>
            The link is invalid, has expired, was cancelled or has already been
            used. Ask an administrator for a new invitation.
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
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Choose a password for <strong>{invitation.email}</strong>. This link
          works until {formatDateTime(invitation.expires_at)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInvitationForm token={token} email={invitation.email} />
      </CardContent>
    </Card>
  );
}
