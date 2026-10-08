"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Trash2,
  UserPlus,
  Shield,
  Loader2,
  Layers,
} from "lucide-react";
import { hasPermission } from "@/lib/rbac";

interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
      jobTitle: string | null;
    };
  }>;
  createdAt: Date | string;
}

interface OrgMember {
  userId: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

export function TeamsClientView({
  organizationId,
  currentUserRole,
  initialTeams,
  orgMembers,
}: {
  organizationId: string;
  currentUserRole: string;
  initialTeams: TeamItem[];
  orgMembers: OrgMember[];
}) {
  const [teams, setTeams] = useState<TeamItem[]>(initialTeams);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAddMemberLoading, setIsAddMemberLoading] = useState(false);

  const canCreateTeam = hasPermission(currentUserRole, "team.create");
  const canManageTeams = hasPermission(currentUserRole, "team.update");
  const canDeleteTeam = hasPermission(currentUserRole, "team.delete");
  const canManageTeamMembers = hasPermission(
    currentUserRole,
    "team.members.manage",
  );

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/organizations/${organizationId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, description: teamDesc }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to create team");
        setIsLoading(false);
        return;
      }

      setTeams((prev) => [
        ...prev,
        {
          id: data.data.id,
          name: data.data.name,
          description: data.data.description,
          memberCount: 0,
          members: [],
          createdAt: new Date().toISOString(),
        },
      ]);

      setIsCreateOpen(false);
      setTeamName("");
      setTeamDesc("");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this functional team?"))
      return;

    try {
      const res = await fetch(`/api/v1/teams/${teamId}`, { method: "DELETE" });
      if (res.ok) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (teamId: string) => {
    if (!selectedUserId) return;
    setIsAddMemberLoading(true);

    try {
      const res = await fetch(`/api/v1/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: "MEMBER" }),
      });

      const data = await res.json();
      if (res.ok) {
        const addedUser = orgMembers.find((m) => m.userId === selectedUserId);
        if (addedUser) {
          setTeams((prev) =>
            prev.map((t) => {
              if (t.id !== teamId) return t;
              return {
                ...t,
                memberCount: t.memberCount + 1,
                members: [
                  ...t.members,
                  {
                    id: data.data.id,
                    userId: selectedUserId,
                    role: "MEMBER",
                    user: {
                      id: selectedUserId,
                      name: addedUser.name,
                      email: addedUser.email,
                      avatar: addedUser.avatar,
                      jobTitle: "Squad Engineer",
                    },
                  },
                ],
              };
            }),
          );
        }
        setSelectedUserId("");
        setActiveTeamId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      const res = await fetch(
        `/api/v1/teams/${teamId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );

      if (res.ok) {
        setTeams((prev) =>
          prev.map((t) => {
            if (t.id !== teamId) return t;
            return {
              ...t,
              memberCount: Math.max(0, t.memberCount - 1),
              members: t.members.filter((m) => m.userId !== userId),
            };
          }),
        );
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
            Functional Teams & Squads
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group developers, QA engineers, and specialists into focused
            delivery teams.
          </p>
        </div>

        {canCreateTeam && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-1.5 font-semibold shrink-0">
                  <Plus className="h-4 w-4" />
                  New Team
                </Button>
              }
            >
              New Team
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  Create Functional Squad
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateTeam} className="space-y-4 pt-2">
                {error && (
                  <div className="text-xs text-red-500 font-medium p-2 bg-red-500/10 rounded-md border border-red-500/20">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="tName" className="text-xs font-semibold">
                    Team Name
                  </Label>
                  <Input
                    id="tName"
                    placeholder="e.g. Frontend Platform, QA & Security"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tDesc" className="text-xs font-semibold">
                    Description (Optional)
                  </Label>
                  <Input
                    id="tDesc"
                    placeholder="Focus area and responsibilities"
                    value={teamDesc}
                    onChange={(e) => setTeamDesc(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Team
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((t) => (
          <div
            key={t.id}
            className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-xs hover:border-border/80 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {t.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {t.description || "General engineering squad"}
                  </p>
                </div>
                {canDeleteTeam && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
                    title="Delete team"
                    onClick={() => handleDeleteTeam(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Members List */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">
                    Members ({t.members.length})
                  </span>
                  {canManageTeamMembers && activeTeamId !== t.id && (
                    <button
                      onClick={() => setActiveTeamId(t.id)}
                      className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      Add Member
                    </button>
                  )}
                </div>

                {activeTeamId === t.id && (
                  <div className="p-3 bg-muted/40 rounded-lg border border-border mb-3 space-y-2">
                    <Label className="text-[11px] font-semibold">
                      Select Organization Member
                    </Label>
                    <select
                      className="w-full h-8 text-xs rounded border border-input bg-background px-2"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">-- Choose member --</option>
                      {orgMembers
                        .filter(
                          (om) =>
                            !t.members.some((m) => m.userId === om.userId),
                        )
                        .map((om) => (
                          <option key={om.userId} value={om.userId}>
                            {om.name || om.email} ({om.email})
                          </option>
                        ))}
                    </select>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setActiveTeamId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!selectedUserId || isAddMemberLoading}
                        onClick={() => handleAddMember(t.id)}
                      >
                        {isAddMemberLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Add to Team"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {t.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={m.user.avatar || ""} />
                          <AvatarFallback className="text-[10px]">
                            {m.user.name?.slice(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                          {m.user.name || m.user.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold"
                        >
                          {m.role}
                        </Badge>
                        {canManageTeamMembers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-red-500"
                            title="Remove from squad"
                            onClick={() => handleRemoveMember(t.id, m.userId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {t.members.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic py-1">
                      No members assigned to this squad yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border rounded-xl">
            <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-foreground">
              No Teams Created Yet
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create functional squads to coordinate delivery across your
              organization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
