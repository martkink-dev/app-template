"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/users/config";

import { createInvitation, type CreateInvitationState } from "./actions";

const initialState: CreateInvitationState = {};

export function InviteForm() {
  const [state, formAction, pending] = useActionState(
    createInvitation,
    initialState,
  );
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const invitation = state.invitation;

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
    } catch {
      // Clipboard can be blocked; the link is still selectable in the field.
      setCopiedLink(null);
    }
  }

  return (
    <div className="grid gap-6">
      <form
        action={formAction}
        className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
      >
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            name="role"
            defaultValue="member"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invitation"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {invitation ? (
        <div className="grid gap-2 rounded-md border p-4" role="status">
          <p className="text-sm">
            Invitation for <strong>{invitation.email}</strong> created. Send
            this link to them. It expires on{" "}
            {formatDateTime(invitation.expiresAt)} and is shown only now.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={invitation.link}
              aria-label="Invitation link"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => copyLink(invitation.link)}
            >
              {copiedLink === invitation.link ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
