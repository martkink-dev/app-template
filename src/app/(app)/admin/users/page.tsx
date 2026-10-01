import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, INVITATION_TTL_HOURS } from "@/lib/users/config";

import { InviteForm } from "./invite-form";
import { InvitationActions, UserActions } from "./row-actions";

export const metadata: Metadata = {
  title: "Users",
};

export default async function AdminUsersPage() {
  // Non-admins get a 404. Hiding the nav link is not the protection.
  const currentAdmin = await requireAdmin();

  // The admin's own session: RLS lets admins read all profiles and invitations.
  const supabase = await createClient();
  const [usersResult, invitationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, display_name, role, status, created_at")
      .order("email"),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at, created_at")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (usersResult.error || invitationsResult.error) {
    throw new Error("Could not load users.");
  }

  const users = usersResult.data;
  const invitations = invitationsResult.data;
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Users"
        description="Invite people, change roles and turn off access."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invite a user</CardTitle>
            <CardDescription>
              You’ll get a link to send to the person yourself. It works once
              and expires after {INVITATION_TTL_HOURS} hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open invitations</CardTitle>
            <CardDescription>
              Cancel an invitation to make its link stop working.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open invitations.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const expired =
                      new Date(invitation.expires_at).getTime() <= now;
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell className="capitalize">
                          {invitation.role}
                        </TableCell>
                        <TableCell>
                          {expired ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : (
                            formatDateTime(invitation.expires_at)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <InvitationActions
                            invitationId={invitation.id}
                            email={invitation.email}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Deactivated users can’t sign in. Their data is kept, and you can
              activate them again.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>{user.email}</div>
                      {user.display_name ? (
                        <div className="text-sm text-muted-foreground">
                          {user.display_name}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "active" ? "outline" : "destructive"
                        }
                      >
                        {user.status === "active" ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {user.id === currentAdmin.id ? (
                        <span className="text-sm text-muted-foreground">
                          You
                        </span>
                      ) : (
                        <UserActions
                          userId={user.id}
                          email={user.email}
                          role={user.role}
                          status={user.status}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
