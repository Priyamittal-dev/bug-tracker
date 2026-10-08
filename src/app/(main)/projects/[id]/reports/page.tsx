import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject } from "@/app/actions/projects";
import { getSprints, getProjectVelocity } from "@/app/actions/sprints";
import { VelocityChart } from "@/components/sprints/velocity-chart";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const [sprints, velocityData] = await Promise.all([
    getSprints(project.id),
    getProjectVelocity(project.id),
  ]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header Breadcrumbs */}
      <div className="border-b px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 bg-card/70 z-10 sticky top-0">
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
              Agile Reports & Team Velocity
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
            Sprint Planning
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full pb-16">
        {/* Velocity Chart */}
        <VelocityChart data={velocityData} />

        {/* Sprint Summary Table */}
        <div className="bg-card border rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Sprint Completion History
            </h3>
          </div>

          {sprints.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              No sprints recorded for this project yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[600px]">
                <thead>
                  <tr className="border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="py-2 px-3">Sprint Name</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Committed Points</th>
                    <th className="py-2 px-3">Completed Points</th>
                    <th className="py-2 px-3">Delivery Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {sprints.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-sans font-semibold text-foreground">
                        {s.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : s.status === "COMPLETED"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{s.totalPoints || 0} pts</td>
                      <td className="py-2.5 px-3">
                        {s.completedPoints || 0} pts
                      </td>
                      <td className="py-2.5 px-3 font-bold text-primary">
                        {s.completionRate || 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
