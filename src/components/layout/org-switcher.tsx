"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";

type OrganizationItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type OrgSwitcherProps = {
  organizations: OrganizationItem[];
  activeOrgId: string | null;
};

export function OrgSwitcher({ organizations, activeOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeOrg =
    organizations.find((o) => o.id === activeOrgId) || organizations[0];

  async function handleSwitchOrg(orgId: string) {
    if (orgId === activeOrgId) {
      setIsOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Switch org failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.data?.id) {
        await handleSwitchOrg(data.data.id);
      }
    } catch (err) {
      console.error("Create org failed:", err);
    } finally {
      setIsLoading(false);
      setIsCreating(false);
      setNewOrgName("");
    }
  }

  if (!activeOrg) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/80 border bg-card/60 transition-all text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-foreground truncate">
              {activeOrg.name}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono uppercase tracking-wider">
              <span className="font-semibold text-primary">
                {activeOrg.role}
              </span>
            </span>
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1 group-hover:text-foreground" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-popover border rounded-lg shadow-xl z-50 p-1.5 space-y-1 backdrop-blur-md">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Organizations
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {organizations.map((org) => {
              const isSelected = org.id === activeOrg.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{org.name}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Role: {org.role}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-1 border-t">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Organization
              </button>
            ) : (
              <form onSubmit={handleCreateOrg} className="p-1 space-y-1.5">
                <input
                  type="text"
                  placeholder="Org Name..."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full text-xs px-2 py-1 border rounded bg-background"
                  autoFocus
                  required
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 text-[11px] font-bold bg-primary text-primary-foreground py-1 rounded hover:opacity-90"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 text-[11px] py-1 border rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
