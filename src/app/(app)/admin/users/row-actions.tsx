"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  type ActionResult,
  deactivateUser,
  deleteUser,
  reactivateUser,
  revokeInvitation,
  setUserRole,
} from "./actions";

function useRowAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  return { pending, error, run };
}

function RowError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-destructive">
      {error}
    </p>
  );
}

export function UserActions({
  userId,
  email,
  role,
  status,
}: {
  userId: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "inactive";
}) {
  const { pending, error, run } = useRowAction();

  return (
    <div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              () => setUserRole(userId, role === "admin" ? "member" : "admin"),
              role === "admin"
                ? `Remove admin rights from ${email}?`
                : `Give admin rights to ${email}?`,
            )
          }
        >
          {role === "admin" ? "Make member" : "Make admin"}
        </Button>

        {status === "active" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => deactivateUser(userId),
                `Deactivate ${email}? They won’t be able to sign in.`,
              )
            }
          >
            Deactivate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => reactivateUser(userId))}
          >
            Activate
          </Button>
        )}

        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            run(
              () => deleteUser(userId),
              `Delete ${email} permanently? This can’t be undone.`,
            )
          }
        >
          Delete
        </Button>
      </div>
      <RowError error={error} />
    </div>
  );
}

export function InvitationActions({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const { pending, error, run } = useRowAction();

  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(
            () => revokeInvitation(invitationId),
            `Cancel the invitation for ${email}? The link will stop working.`,
          )
        }
      >
        Cancel invitation
      </Button>
      <RowError error={error} />
    </div>
  );
}
