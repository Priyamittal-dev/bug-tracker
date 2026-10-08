import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, CheckCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function OrganizationsSettingsPage() {
  const session = await auth();
  const tenant = await getTenantContext();

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  _count: {
                    select: {
                      memberships: true,
                      teams: true,
                      projects: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Organizations & Workspaces
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your organization boundaries, tenant profiles, and active
            workspace selection.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </Link>
      </div>

      <div className="space-y-3">
        {user?.memberships.map((m) => {
          const isActive = tenant?.organizationId === m.organizationId;
          return (
            <div
              key={m.id}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                isActive
                  ? "bg-primary/5 border-primary/40 shadow-xs"
                  : "bg-card border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {m.organization.name}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">
                      slug: {m.organization.slug}
                    </span>
                    <span>•</span>
                    <span>{m.organization._count.memberships} Members</span>
                    <span>•</span>
                    <span>{m.organization._count.teams} Teams</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs font-semibold">
                  <ShieldCheck className="mr-1 h-3 w-3 text-muted-foreground" />
                  {m.role}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
