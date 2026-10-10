import Link from "next/link";
import {
  Home,
  FolderKanban,
  Plus,
  Workflow,
  Settings,
  LogOut,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { getProjects } from "@/app/actions/projects";
import { getCurrentUserWithOrgs, getTenantContext } from "@/lib/tenant";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrgSwitcher } from "./org-switcher";
import { TeamMembersDialog } from "./team-members-dialog";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotlightTrigger } from "@/components/spotlight/spotlight-trigger";
import { Code2 } from "lucide-react";

export async function Sidebar() {
  const [userWithOrgs, tenant, projects] = await Promise.all([
    getCurrentUserWithOrgs(),
    getTenantContext(),
    getProjects(),
  ]);

  if (!userWithOrgs || !tenant) return null;

  const organizations = userWithOrgs.memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  return (
    <aside className="w-full h-full border-r border-border/50 bg-background/60 backdrop-blur-xl flex flex-col select-none shadow-sm transition-all duration-300">
      {/* Workspace / Organization Switcher Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between px-1 pr-7 md:pr-1">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-black text-xs shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
              ZT
            </div>
            <span className="text-xs font-black tracking-tight text-foreground">
              BugTracker
            </span>
          </Link>
          <span className="hidden md:inline-block text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
            SaaS
          </span>
        </div>

        <OrgSwitcher
          organizations={organizations}
          activeOrgId={tenant.organizationId}
        />

        {/* Global Spotlight Quick Trigger (⌘K) */}
        <SpotlightTrigger />
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Workspace
          </div>
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted/80 text-foreground transition-all duration-200 hover:shadow-xs group"
          >
            <Home className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Executive Dashboard
          </Link>
          <Link
            href="/projects"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted/80 text-foreground transition-all duration-200 hover:shadow-xs group"
          >
            <FolderKanban className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Projects
            <span className="ml-auto font-mono text-[10px] bg-background border border-border/50 shadow-xs px-1.5 py-0.5 rounded font-bold text-muted-foreground group-hover:text-primary transition-colors">
              {projects.length}
            </span>
          </Link>
          <Link
            href="/issues"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted/80 text-foreground transition-all duration-200 hover:shadow-xs group"
          >
            <Workflow className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            All Issues
          </Link>

          {/* Members & Teams Modal */}
          <TeamMembersDialog
            organizationId={tenant.organizationId}
            organizationName={tenant.organization.name}
            currentUserRole={tenant.role}
          />
        </div>

        {/* Workspace Projects Quick Switcher */}
        <div className="space-y-1">
          <div className="px-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
            <span>Projects</span>
            <CreateProjectDialog />
          </div>

          <div className="space-y-0.5">
            {projects.map((p) => {
              const criticalCount = p.issues.filter(
                (i) => i.severity === "CRITICAL" && i.status !== "CLOSED",
              ).length;

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors group"
                >
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {p.key}
                  </span>
                  <span className="truncate text-foreground max-w-[120px]">
                    {p.name}
                  </span>
                  {criticalCount > 0 && (
                    <span
                      className="ml-auto h-2 w-2 rounded-full bg-red-500"
                      title={`${criticalCount} critical defect(s)`}
                    />
                  )}
                </Link>
              );
            })}
            {projects.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                No projects in this workspace
              </div>
            )}
          </div>
        </div>

        {/* Settings Navigation */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Administration
          </div>
          <Link
            href="/settings/profile"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted text-foreground transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Workspace Settings
          </Link>
          <Link
            href="/settings/billing"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted text-foreground transition-colors"
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Billing & Payments
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted text-foreground transition-colors"
          >
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Pricing & Plans
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted text-foreground transition-colors group"
          >
            <Code2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span>API Docs & Swagger</span>
            <span className="ml-auto font-mono text-[9px] bg-blue-500/10 text-blue-500 border border-blue-500/30 px-1 py-0.2 rounded font-bold">
              OAS
            </span>
          </Link>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t bg-muted/20 space-y-2 mt-auto">
        <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/50 hover:bg-muted/50 transition-colors gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar className="h-8 w-8 border border-border shrink-0">
              <AvatarImage src={tenant.user.avatar || ""} />
              <AvatarFallback className="text-xs font-bold">
                {tenant.user.name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground truncate">
                {tenant.user.name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {tenant.user.jobTitle || "Engineer"} •{" "}
                <span className="font-semibold text-primary">
                  {tenant.role}
                </span>
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <form
          action={async () => {
            "use server";
            const { signOut } = await import("@/auth");
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md font-semibold transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
