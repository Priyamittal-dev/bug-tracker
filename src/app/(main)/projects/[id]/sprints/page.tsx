import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject } from "@/app/actions/projects";
import { getSprints } from "@/app/actions/sprints";
import { getIssues } from "@/app/actions/issues";
import { getUsers } from "@/app/actions/users";
import { SprintPlanningView } from "@/components/sprints/sprint-planning-view";
import { ArrowLeft, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ProjectSprintsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const [sprints, allIssues, users] = await Promise.all([
    getSprints(project.id),
    getIssues(project.id),
    getUsers(),
  ]);

  // Backlog issues are those without an active/planning sprint
  const backlogIssues = allIssues.filter(
    (i: any) =>
      !i.sprintId &&
      i.type !== "EPIC" &&
      i.status !== "DONE" &&
      i.status !== "CLOSED",
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Breadcrumbs */}
      <div className="border-b px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 bg-card/70 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            render={<Link href={`/projects/${project.id}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black bg-primary text-primary-foreground px-2 py-0.5 rounded">
              {project.key}
            </span>
            <h1 className="text-base font-bold text-foreground">
              Scrum Sprints & Backlog
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold"
            render={<Link href={`/projects/${project.id}/board`} />}
          >
            Switch to Kanban Board
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SprintPlanningView
          project={project}
          sprints={sprints}
          backlogIssues={backlogIssues}
          users={users}
        />
      </div>
    </div>
  );
}
