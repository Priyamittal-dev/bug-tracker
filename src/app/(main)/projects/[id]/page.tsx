import { getProject } from "@/app/actions/projects";
import { getIssues } from "@/app/actions/issues";
import { getUsers } from "@/app/actions/users";
import { getProjectAnalytics } from "@/app/actions/analytics";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FolderKanban,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const [issues, users, analytics] = await Promise.all([
    getIssues(project.id),
    getUsers(),
    getProjectAnalytics(project.id),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Project Breadcrumbs and Summary Header */}
      <div className="border-b px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/70 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            render={<Link href="/projects" />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-xs font-black bg-primary text-primary-foreground px-2 py-0.5 rounded shrink-0">
              {project.key}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-foreground leading-none truncate">
                  {project.name}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 shrink-0 hidden sm:inline-flex"
                >
                  {project.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {project.description ||
                  "Enterprise Bug Tracking & Resolution Workspace"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI stats in header */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border text-[11px] sm:text-xs">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold text-foreground">{issues.length}</span>
          </div>

          {analytics.severity.critical > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-red-500/20 font-semibold text-[11px] sm:text-xs">
              <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{analytics.severity.critical} Critical Blockers</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-emerald-500/20 font-semibold text-[11px] sm:text-xs">
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{analytics.resolutionRate}% Resolved</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Component */}
      <div className="flex-1 overflow-hidden">
        <ProjectWorkspace
          project={project}
          issues={issues}
          users={users}
          analytics={analytics}
        />
      </div>
    </div>
  );
}
