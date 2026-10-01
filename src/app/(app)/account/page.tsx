import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Account" description={`Signed in as ${user.email}.`} />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your email address is your username. Ask an administrator if it
              needs to change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm displayName={user.displayName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Changing your password signs you out on your other devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm email={user.email} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
