import { getProjects } from "@/app/actions/projects";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanban,
  ShieldAlert,
  CheckCircle2,
  Activity,
  ArrowRight,
  Bug,
  Clock,
  Tag,
  ExternalLink,
  Layers,
  CheckSquare,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IssueTypeBadge,
  IssueSeverityBadge,
  IssueStatusBadge,
} from "@/components/common/issue-badges";
import { formatDistanceToNow } from "date-fns";
import { getTenantContext } from "@/lib/tenant";
import { SpotlightTrigger } from "@/components/spotlight/spotlight-trigger";

export default async function Dashboard() {
  const tenant = await getTenantContext();
  const orgId = tenant?.organizationId;

  const [
    projects,
    totalIssues,
    criticalIssues,
    resolvedIssues,
    recentIssues,
    timeAgg,
    activeReleases,
  ] = await Promise.all([
    getProjects(),
    orgId ? prisma.issue.count({ where: { organizationId: orgId } }) : 0,
    orgId
      ? prisma.issue.count({
          where: {
            organizationId: orgId,
            severity: "CRITICAL",
            status: { not: "CLOSED" },
          },
        })
      : 0,
    orgId
      ? prisma.issue.count({
          where: {
            organizationId: orgId,
            status: { in: ["RESOLVED", "CLOSED"] },
          },
        })
      : 0,
    orgId
      ? prisma.issue.findMany({
          where: { organizationId: orgId },
          take: 6,
          orderBy: { createdAt: "desc" },
          include: {
            project: true,
            assignee: true,
            comments: {
              select: { id: true },
            },
          },
        })
      : [],
    orgId
      ? prisma.timeLog.aggregate({
          where: { organizationId: orgId },
          _sum: { timeSpent: true },
        })
      : { _sum: { timeSpent: 0 } },
    orgId
      ? prisma.release.count({
          where: { organizationId: orgId, status: "UNRELEASED" },
        })
      : 0,
  ]);

  const totalHoursLogged = timeAgg._sum.timeSpent || 0;
  const resolutionRate =
    totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
  const userName = tenant?.user?.name || "Engineer";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-16">
      {/* Modern Hero Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Workspace Operational
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Organization:{" "}
                <strong className="text-foreground">
                  {tenant?.organization.name}
                </strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Welcome back, {userName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Track defects, release velocity, and sprint throughput across all
              your software delivery pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <div className="w-44 hidden lg:block">
              <SpotlightTrigger />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs shadow-2xs font-semibold"
              render={<Link href="/issues" />}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5 text-primary" />
              All Issues
            </Button>
            <Button
              size="sm"
              className="text-xs shadow-sm font-semibold"
              render={<Link href="/projects" />}
            >
              <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
              Workspaces
            </Button>
          </div>
        </div>
      </div>

      {/* 6 Main KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="group relative overflow-hidden border-border/80 hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/80" />
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Workspaces
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <FolderKanban className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {projects.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Active trackers
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-border/80 hover:border-amber-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/80" />
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Defects
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <Bug className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {totalIssues}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Total reported
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-border/80 hover:border-red-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/80" />
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Critical
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400">
              {criticalIssues}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-border/80 hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/80" />
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Resolution
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {resolutionRate}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {resolvedIssues} resolved
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-border/80 hover:border-indigo-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/80" />
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Logged Time
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {totalHoursLogged.toFixed(1)}h
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Total effort logged
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-border/80 hover:border-purple-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500/80" />
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Releases
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
              <Tag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
              {activeReleases}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Active milestones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Active Projects Grid & Defect Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Project Workspaces */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              Active Project Workspaces
            </h2>
            <Link
              href="/projects"
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 group"
            >
              View All Workspaces{" "}
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => {
              const total = project.issues.length;
              const resolved = project.issues.filter(
                (i) => i.status === "RESOLVED" || i.status === "CLOSED",
              ).length;
              const critical = project.issues.filter(
                (i) => i.severity === "CRITICAL" && i.status !== "CLOSED",
              ).length;
              const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;

              return (
                <Card
                  key={project.id}
                  className="group hover:border-primary/50 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden"
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-md border border-primary/20">
                        {project.key}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded">
                        {project.category}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold truncate">
                      <Link
                        href={`/projects/${project.id}`}
                        className="group-hover:text-primary transition-colors flex items-center justify-between"
                      >
                        <span>{project.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
                      </Link>
                    </CardTitle>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                        {project.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                        <span>Progress</span>
                        <span className="font-bold text-foreground">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border/50">
                      <span className="text-muted-foreground text-[11px] font-medium">
                        {total} total {total === 1 ? "defect" : "defects"}
                      </span>
                      {critical > 0 ? (
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-500/20">
                          <ShieldAlert className="h-3 w-3" /> {critical}{" "}
                          critical
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Stable
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-[11px] font-semibold h-7 px-2"
                        render={<Link href={`/projects/${project.id}`} />}
                      >
                        Open Board
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {projects.length === 0 && (
              <div className="col-span-full py-12 px-4 text-center border-2 border-dashed border-border/70 rounded-xl bg-card/40">
                <FolderKanban className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-foreground">
                  No active workspaces
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Create your first workspace project to start logging bugs,
                  tracking sprints, and managing defect lifecycles.
                </p>
                <div className="mt-4">
                  <Button size="sm" render={<Link href="/projects" />}>
                    Create Project Workspace
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Recent Defect Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Latest Defect Stream
            </h2>
            <Link
              href="/issues"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Filter All
            </Link>
          </div>

          <Card className="shadow-2xs border-border/80">
            <CardContent className="p-3 sm:p-4 space-y-2.5">
              {recentIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/projects/${issue.projectId}`}
                  className="block p-3 rounded-xl bg-muted/20 hover:bg-muted/60 transition-all border border-border/40 hover:border-primary/30 text-xs space-y-1.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-primary text-[11px] group-hover:underline">
                      {issue.key}
                    </span>
                    <IssueSeverityBadge severity={issue.severity} />
                  </div>

                  <div className="font-semibold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {issue.title}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
                    <div className="flex items-center gap-1.5 truncate">
                      <IssueTypeBadge type={issue.type} />
                      <span className="truncate max-w-[100px]">
                        {issue.project.name}
                      </span>
                    </div>
                    <span className="shrink-0" suppressHydrationWarning>
                      {formatDistanceToNow(new Date(issue.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </Link>
              ))}

              {recentIssues.length === 0 && (
                <div className="py-10 text-center text-xs text-muted-foreground italic">
                  No defects logged in this organization yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
