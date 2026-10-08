import { getProject } from "@/app/actions/projects";
import { getIssues } from "@/app/actions/issues";
import { getUsers } from "@/app/actions/users";
import { getProjectAnalytics } from "@/app/actions/analytics";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProjectBoardPage({
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
      <div className="border-b px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 bg-card/70 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            render={<Link href="/projects" />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-black bg-primary text-primary-foreground px-2 py-0.5 rounded">
              {project.key}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground leading-none">
                  {project.name} — Board
                </h1>
                <Badge variant="outline" className="text-[10px] py-0">
                  {project.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {project.description || "Kanban workflow view"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-md border">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold text-foreground">{issues.length}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{analytics.resolutionRate}% Resolved</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ProjectWorkspace
          project={project}
          issues={issues}
          users={users}
          analytics={analytics}
          defaultTab="board"
        />
      </div>
    </div>
  );
}
