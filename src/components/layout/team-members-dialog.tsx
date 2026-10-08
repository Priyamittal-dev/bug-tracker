"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, Shield, Loader2, Building, Mail } from "lucide-react";

type Member = {
  membershipId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    jobTitle: string | null;
  };
};

type Team = {
  id: string;
  name: string;
  description: string | null;
  members: Array<{
    user: {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
    };
  }>;
};

type TeamMembersDialogProps = {
  organizationId: string;
  organizationName: string;
  currentUserRole: string;
};

export function TeamMembersDialog({
  organizationId,
  organizationName,
  currentUserRole,
}: TeamMembersDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"members" | "teams">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  // Team Form State
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [membersRes, teamsRes] = await Promise.all([
        fetch(`/api/v1/organizations/${organizationId}/members`),
        fetch(`/api/v1/organizations/${organizationId}/teams`),
      ]);

      const membersData = await membersRes.json();
      const teamsData = await teamsRes.json();

      if (membersData.success) setMembers(membersData.data);
      if (teamsData.success) setTeams(teamsData.data);
    } catch (err) {
      console.error("Failed to load organization data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      loadData();
      setInviteMessage(null);
    }
  }

  async function handleInviteUser(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteMessage(null);

    try {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        },
      );

      const data = await res.json();
      if (res.ok) {
        setInviteMessage("User invited successfully!");
        setInviteEmail("");
        loadData();
      } else {
        setInviteMessage(data.error?.message || "Failed to invite user");
      }
    } catch (err) {
      setInviteMessage("Error inviting user");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsCreatingTeam(true);
    try {
      const res = await fetch(`/api/v1/organizations/${organizationId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        setTeamName("");
        setTeamDesc("");
        loadData();
      }
    } catch (err) {
      console.error("Failed to create team:", err);
    } finally {
      setIsCreatingTeam(false);
    }
  }

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted text-foreground transition-colors w-full text-left cursor-pointer"
        title="Manage Members and Teams"
      >
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>Members & Teams</span>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                {organizationName} Directory
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage workspace members, team assignments, and RBAC
                permissions.
              </p>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Your Role:{" "}
              <span className="font-bold text-primary ml-1">
                {currentUserRole}
              </span>
            </Badge>
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex border-b gap-4 text-xs font-semibold mt-2">
          <button
            onClick={() => setTab("members")}
            className={`pb-2 border-b-2 transition-colors ${
              tab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Workspace Members ({members.length})
          </button>
          <button
            onClick={() => setTab("teams")}
            className={`pb-2 border-b-2 transition-colors ${
              tab === "teams"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Teams ({teams.length})
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tab === "members" ? (
          <div className="space-y-6 pt-2">
            {/* Invite Member Section (if allowed) */}
            {canManage && (
              <form
                onSubmit={handleInviteUser}
                className="p-3 bg-muted/40 border rounded-lg space-y-3"
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  Invite New Member
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-8 text-xs h-8"
                      required
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="text-xs h-8 px-2 border rounded-md bg-background"
                  >
                    <option value="MEMBER">Role: Member</option>
                    <option value="ADMIN">Role: Admin</option>
                    <option value="GUEST">Role: Guest</option>
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isInviting}
                  >
                    {isInviting ? "Inviting..." : "Send Invite"}
                  </Button>
                </div>
                {inviteMessage && (
                  <div className="text-xs text-primary font-medium">
                    {inviteMessage}
                  </div>
                )}
              </form>
            )}

            {/* Members List */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Members
              </div>
              <div className="divide-y border rounded-lg">
                {members.map((m) => (
                  <div
                    key={m.membershipId}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.user.avatar || ""} />
                        <AvatarFallback>{m.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate text-foreground">
                          {m.user.name || "User"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {m.user.email} • {m.user.jobTitle || "Engineer"}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={m.role === "OWNER" ? "default" : "secondary"}
                      className="text-[10px] font-mono uppercase font-bold"
                    >
                      {m.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Create Team Form (if allowed) */}
            {canManage && (
              <form
                onSubmit={handleCreateTeam}
                className="p-3 bg-muted/40 border rounded-lg space-y-3"
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Create Squad / Team
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Team Name (e.g. Infrastructure Squad)"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="text-xs h-8"
                    required
                  />
                  <Input
                    placeholder="Short description of responsibility"
                    value={teamDesc}
                    onChange={(e) => setTeamDesc(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isCreatingTeam}
                  >
                    {isCreatingTeam ? "Creating..." : "Create Team"}
                  </Button>
                </div>
              </form>
            )}

            {/* Teams List */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Teams in {organizationName}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 border rounded-lg bg-card/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {t.name}
                      </span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                        {t.members.length} member(s)
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-[11px] text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                ))}
                {teams.length === 0 && (
                  <div className="text-xs text-muted-foreground p-4 text-center">
                    No teams configured yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
