"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
} from "@/lib/validations/password";

import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      {/* Lets password managers update the login under the right username. */}
      <input
        type="email"
        name="username"
        value={email}
        autoComplete="username"
        readOnly
        hidden
      />

      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby="password-rules"
          required
        />
        <ul
          id="password-rules"
          className="list-disc pl-5 text-sm text-muted-foreground"
        >
          {PASSWORD_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Repeat new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
