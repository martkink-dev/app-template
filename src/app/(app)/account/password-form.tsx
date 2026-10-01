"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
} from "@/lib/validations/password";

import { type AccountFormState, changePassword } from "./actions";

const initialState: AccountFormState = {};

export function PasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    async (prevState: AccountFormState, formData: FormData) => {
      const result = await changePassword(prevState, formData);
      if (result.ok) toast.success("Password changed");
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="grid max-w-sm gap-4">
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
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby="new-password-rules"
          required
        />
        <ul
          id="new-password-rules"
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

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
