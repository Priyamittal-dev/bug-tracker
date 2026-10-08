"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateEpicDialog } from "@/components/epics/create-epic-dialog";
import { Milestone, Calendar, Link2, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RoadmapView({
  project,
  roadmapData,
}: {
  project: { id: string; name: string; key: string };
  roadmapData: {
    epics: any[];
    milestones: any[];
    dependencies: any[];
  } | null;
}) {
  const epics = roadmapData?.epics || [];
  const milestones = roadmapData?.milestones || [];
  const dependencies = roadmapData?.dependencies || [];

  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredEpics = epics.filter((epic) => {
    if (filterStatus === "ALL") return true;
    if (filterStatus === "OPEN")
      return epic.status !== "DONE" && epic.status !== "CLOSED";
    if (filterStatus === "DONE")
      return epic.status === "DONE" || epic.status === "CLOSED";
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-foreground">
              Strategic Roadmap & Milestones
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Long-term initiatives, timeline delivery dates, and dependency
            tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 rounded-md border bg-background px-2.5 text-xs text-foreground"
          >
            <option value="ALL">All Epics</option>
            <option value="OPEN">In Flight & Open</option>
            <option value="DONE">Completed Epics</option>
          </select>

          <CreateEpicDialog projectId={project.id} />
        </div>
      </div>

      {/* Epics Timeline Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Milestone className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-bold text-foreground">
              Epics & Initiatives
            </h3>
            <Badge variant="secondary" className="text-[10px] font-mono py-0">
              {filteredEpics.length}
            </Badge>
          </div>
        </div>

        {filteredEpics.length === 0 ? (
          <div className="p-8 text-center border rounded-xl bg-card/40 text-muted-foreground text-xs">
            <Milestone className="h-8 w-8 mx-auto mb-2 text-purple-400/50" />
            No epics planned yet. Click "Create Epic" to establish long-term
            strategic initiatives.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEpics.map((epic) => {
              const startDateFormatted = epic.startDate
                ? new Date(epic.startDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "No start";
              const targetDateFormatted = epic.targetDate
                ? new Date(epic.targetDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "No target";

              return (
                <div
                  key={epic.id}
                  className="bg-card border rounded-xl p-4 shadow-xs hover:border-purple-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 shrink-0">
                        {epic.key}
                      </span>

                      <Link
                        href={`/issues/${epic.id}`}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate"
                      >
                        {epic.title}
                      </Link>

                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 shrink-0"
                      >
                        {epic.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span suppressHydrationWarning>
                          {startDateFormatted} → {targetDateFormatted}
                        </span>
                      </div>

                      <div className="bg-muted/60 px-2 py-0.5 rounded border font-semibold text-foreground">
                        {epic.completedIssues} / {epic.totalIssues} issues
                      </div>

                      <div className="font-bold text-purple-600 dark:text-purple-400">
                        {epic.progress}%
                      </div>
                    </div>
                  </div>

                  {epic.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {epic.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden border">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, epic.progress))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Milestones & Dependencies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Milestones */}
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Flag className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Release Milestones
            </h3>
          </div>

          {milestones.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              No milestones created for this project.
            </div>
          ) : (
            <div className="space-y-2">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg border bg-muted/20"
                >
                  <div>
                    <span className="font-semibold text-foreground block">
                      {m.name}
                    </span>
                    <span
                      className="text-[10px] text-muted-foreground font-mono"
                      suppressHydrationWarning
                    >
                      Due:{" "}
                      {m.dueDate
                        ? new Date(m.dueDate).toLocaleDateString()
                        : "Flexible"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">
                      {m.completedIssues}/{m.totalIssues}
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {m.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blocking Dependencies */}
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Link2 className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Blocking Dependencies
            </h3>
          </div>

          {dependencies.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              No blocking dependencies currently flagged.
            </div>
          ) : (
            <div className="space-y-2">
              {dependencies.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg border bg-muted/20 font-mono"
                >
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                    <span>{d.fromIssue}</span>
                    <span className="text-[10px] uppercase bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">
                      {d.type}
                    </span>
                    <span className="text-foreground">{d.toIssue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
