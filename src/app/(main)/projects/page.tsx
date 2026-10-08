import { getProjects } from "@/app/actions/projects";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Project Workspaces
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage product repositories, defect tracking boards, and release
            sprints across your organization.
          </p>
        </div>
        <div className="shrink-0">
          <CreateProjectDialog />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const totalIssues = project.issues.length;
          const resolvedCount = project.issues.filter(
            (i) => i.status === "RESOLVED" || i.status === "CLOSED",
          ).length;
          const criticalCount = project.issues.filter(
            (i) => i.severity === "CRITICAL" && i.status !== "CLOSED",
          ).length;
          const progressPercent =
            totalIssues > 0
              ? Math.round((resolvedCount / totalIssues) * 100)
              : 0;

          return (
            <Card
              key={project.id}
              className="group hover:border-primary/50 transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-md border border-primary/20">
                    {project.key}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold"
                  >
                    {project.category}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
                </CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {project.description ||
                    "No description provided for this workspace."}
                </p>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                {/* Progress Bar */}
                <div className="space-y-1.5 pt-3 border-t border-border/50">
                  <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Resolution Progress</span>
                    <span className="text-foreground font-bold">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {totalIssues}{" "}
                      <span className="font-normal text-muted-foreground text-[11px]">
                        {totalIssues === 1 ? "defect" : "defects"}
                      </span>
                    </span>
                    {criticalCount > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                        <ShieldAlert className="h-3 w-3" />
                        {criticalCount} critical
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" />
                        Stable
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 text-xs gap-1 group font-semibold"
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
          <div className="col-span-full py-16 px-4 text-center border-2 border-dashed border-border/60 rounded-xl bg-card/40 space-y-2">
            <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">
              No project workspaces yet
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Initialize your first tracker workspace to start logging defects,
              managing sprints, and tracking releases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
