"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Search,
  Trash2,
  Mail,
  Shield,
  Check,
  Loader2,
} from "lucide-react";
import { hasPermission } from "@/lib/rbac";

const ALL_ROLES = [
  "ORGANIZATION_OWNER",
  "ORGANIZATION_ADMIN",
  "PROJECT_ADMIN",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "QA_ENGINEER",
  "PRODUCT_MANAGER",
  "REPORTER",
  "VIEWER",
  "GUEST",
];

interface MemberItem {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  avatar: string | null;
  jobTitle: string | null;
  role: string;
  status: string;
  joinedAt: Date | string;
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
  inviter: string | null;
}

export function MembersClientView({
  organizationId,
  currentUserRole,
  initialMembers,
  initialInvitations,
}: {
  organizationId: string;
  currentUserRole: string;
  initialMembers: MemberItem[];
  initialInvitations: InvitationItem[];
}) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [invitations, setInvitations] =
    useState<InvitationItem[]>(initialInvitations);
  const [search, setSearch] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canManageMembers = hasPermission(
    currentUserRole,
    "organization.members.manage",
  );
  const canManageRoles = hasPermission(
    currentUserRole,
    "organization.roles.manage",
  );

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase()),
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to invite member");
        setIsLoading(false);
        return;
      }

      if (data.data?.type === "MEMBER_ADDED") {
        setMembers((prev) => [
          ...prev,
          {
            id: data.data.membership.id,
            userId: data.data.membership.userId,
            name: data.data.membership.name,
            email: data.data.membership.email,
            avatar: null,
            jobTitle: "Team Member",
            role: data.data.membership.role,
            status: "ACTIVE",
            joinedAt: new Date().toISOString(),
          },
        ]);
      } else if (data.data?.type === "INVITATION_CREATED") {
        setInvitations((prev) => [
          ...prev,
          {
            id: data.data.invitation.id,
            email: data.data.invitation.email,
            role: data.data.invitation.role,
            status: "PENDING",
            expiresAt: data.data.invitation.expiresAt,
            inviter: "You",
          },
        ]);
      }

      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("DEVELOPER");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role: newRole }),
        },
      );

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this member from the organization?",
      )
    )
      return;

    try {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Organization Members & RBAC
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage who has access to this workspace and configure granular role
            permissions.
          </p>
        </div>

        {canManageMembers && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-1.5 font-semibold shrink-0">
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              }
            >
              Invite Member
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Invite Teammate to Organization
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleInvite} className="space-y-4 pt-2">
                {error && (
                  <div className="text-xs text-red-500 font-medium p-2 bg-red-500/10 rounded-md border border-red-500/20">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="invEmail" className="text-xs font-semibold">
                    Work Email
                  </Label>
                  <Input
                    id="invEmail"
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invRole" className="text-xs font-semibold">
                    Assigned Role
                  </Label>
                  <select
                    id="invRole"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-1.5 h-4 w-4" />
                    )}
                    Send Invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter members by name, email, or role..."
          className="pl-9 h-9 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Members Table */}
      <div className="border border-border rounded-xl overflow-x-auto bg-card">
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Joined</th>
              {canManageMembers && (
                <th className="py-3 px-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredMembers.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatar || ""} />
                      <AvatarFallback className="font-semibold text-xs">
                        {m.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {m.name || "Anonymous"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {canManageRoles ? (
                    <select
                      className="h-7 text-xs rounded border border-border bg-background px-2 py-0.5 font-semibold text-foreground"
                      value={m.role}
                      onChange={(e) =>
                        handleRoleChange(m.userId, e.target.value)
                      }
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="font-semibold text-[10px]"
                    >
                      {m.role}
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {m.status}
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(m.joinedAt).toLocaleDateString()}
                </td>
                {canManageMembers && (
                  <td className="py-3 px-4 text-right">
                    {m.role !== "ORGANIZATION_OWNER" && m.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        title="Remove member"
                        onClick={() => handleRemoveMember(m.userId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Pending Invitations ({invitations.length})
          </h3>
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3.5 text-xs hover:bg-muted/30"
              >
                <div>
                  <p className="font-semibold text-foreground">{inv.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Role: {inv.role} • Invited by{" "}
                    {inv.inviter || "Workspace Admin"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-amber-500 border-amber-500/30"
                >
                  Pending Acceptance
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
