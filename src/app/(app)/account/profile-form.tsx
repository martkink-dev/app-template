"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type AccountFormState, updateDisplayName } from "./actions";

const initialState: AccountFormState = {};

export function ProfileForm({ displayName }: { displayName: string | null }) {
  const [state, formAction, pending] = useActionState(
    async (prevState: AccountFormState, formData: FormData) => {
      const result = await updateDisplayName(prevState, formData);
      if (result.ok) toast.success("Profile saved");
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="grid max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName ?? ""}
          autoComplete="name"
          maxLength={100}
          required
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
