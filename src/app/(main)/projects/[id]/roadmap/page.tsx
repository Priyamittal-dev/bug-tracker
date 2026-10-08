import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject } from "@/app/actions/projects";
import { getProjectRoadmap } from "@/app/actions/epics";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ProjectRoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const roadmapData = await getProjectRoadmap(project.id);

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
              Strategic Roadmap & Epics
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold"
            render={<Link href={`/projects/${project.id}/sprints`} />}
          >
            Switch to Sprints
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <RoadmapView project={project} roadmapData={roadmapData} />
      </div>
    </div>
  );
}
