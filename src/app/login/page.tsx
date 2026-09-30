import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use the email address your invitation was sent to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* The server action validates `next` again; never trust it here. */}
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </CardContent>
      </Card>
    </main>
  );
}
