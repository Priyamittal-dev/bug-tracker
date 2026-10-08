"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateSprintDialog } from "./create-sprint-dialog";
import { StartSprintDialog } from "./start-sprint-dialog";
import { CompleteSprintDialog } from "./complete-sprint-dialog";
import { BurndownChart } from "./burndown-chart";
import {
  addIssuesToSprint,
  removeIssuesFromSprint,
  getSprintBurndown,
} from "@/app/actions/sprints";
import { updateIssue } from "@/app/actions/issues";
import { Timer, Flame, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SprintPlanningView({
  project,
  sprints = [],
  backlogIssues = [],
  users = [],
}: {
  project: { id: string; name: string; key: string };
  sprints: any[];
  backlogIssues: any[];
  users?: any[];
}) {
  const router = useRouter();
  const [activeBurndown, setActiveBurndown] = useState<any | null>(null);
  const [expandedSprints, setExpandedSprints] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = { backlog: true };
    sprints.forEach((s) => {
      initial[s.id] = s.status === "ACTIVE" || s.status === "PLANNING";
    });
    return initial;
  });

  const toggleExpand = (id: string) => {
    setExpandedSprints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShowBurndown = async (sprintId: string) => {
    if (activeBurndown && activeBurndown.sprintId === sprintId) {
      setActiveBurndown(null);
      return;
    }
    const data = await getSprintBurndown(sprintId);
    setActiveBurndown(data);
  };

  const handleMoveIssue = async (
    issueId: string,
    targetSprintId: string | null,
  ) => {
    if (targetSprintId) {
      await addIssuesToSprint(targetSprintId, [issueId]);
    } else {
      // Find current sprint
      const current = sprints.find((s) =>
        s.issues?.some((i: any) => i.id === issueId),
      );
      if (current) {
        await removeIssuesFromSprint(current.id, [issueId]);
      }
    }
    router.refresh();
  };

  const handleUpdatePoints = async (issueId: string, pointsStr: string) => {
    const pts = parseFloat(pointsStr);
    await updateIssue(issueId, { storyPoints: isNaN(pts) ? null : pts });
    router.refresh();
  };

  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const planningSprints = sprints.filter((s) => s.status === "PLANNING");

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Top Planning Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              Scrum Sprint Planning
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plan sprints, estimate story points, and monitor sprint burndown
            velocity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CreateSprintDialog
            projectId={project.id}
            suggestedSprintNumber={sprints.length + 1}
          />
        </div>
      </div>

      {/* Active Burndown Tray (if open) */}
      {activeBurndown && (
        <div className="relative">
          <BurndownChart data={activeBurndown} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActiveBurndown(null)}
            className="absolute top-4 right-4 text-xs h-7"
          >
            Close Chart
          </Button>
        </div>
      )}

      {/* 1. ACTIVE SPRINT SECTION */}
      {activeSprint && (
        <div className="bg-card border-2 border-emerald-500/30 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleExpand(activeSprint.id)}
                className="text-foreground hover:text-primary transition-colors"
              >
                {expandedSprints[activeSprint.id] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-black text-foreground">
                  {activeSprint.name}
                </h3>
                <Badge className="bg-emerald-600 text-white text-[10px] py-0 font-bold">
                  ACTIVE
                </Badge>
              </div>

              {activeSprint.goal && (
                <span className="text-xs text-muted-foreground italic border-l pl-3 hidden md:inline">
                  "{activeSprint.goal}"
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="font-mono text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
                <span className="font-bold text-foreground">
                  {activeSprint.completedPoints || 0}
                </span>{" "}
                / {activeSprint.totalPoints || 0} pts
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShowBurndown(activeSprint.id)}
                className="gap-1.5 h-7 text-xs"
              >
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                Burndown
              </Button>

              <CompleteSprintDialog
                sprint={activeSprint}
                completedIssuesCount={
                  activeSprint.issues?.filter(
                    (i: any) => i.status === "DONE" || i.status === "CLOSED",
                  ).length || 0
                }
                incompleteIssuesCount={
                  activeSprint.issues?.filter(
                    (i: any) => i.status !== "DONE" && i.status !== "CLOSED",
                  ).length || 0
                }
                completedPoints={activeSprint.completedPoints || 0}
                incompletePoints={Math.max(
                  0,
                  (activeSprint.totalPoints || 0) -
                    (activeSprint.completedPoints || 0),
                )}
                otherSprints={planningSprints}
              />
            </div>
          </div>

          {expandedSprints[activeSprint.id] && (
            <div className="p-3 space-y-2">
              {activeSprint.issues?.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No issues in active sprint. Move issues from Product Backlog
                  below.
                </div>
              ) : (
                activeSprint.issues?.map((issue: any) => (
                  <SprintIssueRow
                    key={issue.id}
                    issue={issue}
                    sprints={sprints}
                    onMove={handleMoveIssue}
                    onUpdatePoints={handleUpdatePoints}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. PLANNING SPRINTS (Future Backlog) */}
      <div className="space-y-4">
        {planningSprints.map((sprint) => (
          <div
            key={sprint.id}
            className="bg-card border rounded-xl overflow-hidden shadow-xs"
          >
            <div className="bg-muted/40 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleExpand(sprint.id)}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {expandedSprints[sprint.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {sprint.name}
                  </h3>
                  <Badge variant="outline" className="text-[10px] py-0">
                    PLANNING
                  </Badge>
                </div>

                {sprint.goal && (
                  <span className="text-xs text-muted-foreground italic border-l pl-3 hidden md:inline">
                    "{sprint.goal}"
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="font-mono text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                  {sprint.issueCount || sprint.issues?.length || 0} issues •{" "}
                  {sprint.totalPoints || 0} pts
                </div>

                <StartSprintDialog
                  sprint={sprint}
                  issueCount={sprint.issueCount || sprint.issues?.length || 0}
                  totalPoints={sprint.totalPoints || 0}
                />
              </div>
            </div>

            {expandedSprints[sprint.id] && (
              <div className="p-3 space-y-2">
                {sprint.issues?.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Sprint is empty. Assign issues from the Product Backlog
                    below.
                  </div>
                ) : (
                  sprint.issues?.map((issue: any) => (
                    <SprintIssueRow
                      key={issue.id}
                      issue={issue}
                      sprints={sprints}
                      onMove={handleMoveIssue}
                      onUpdatePoints={handleUpdatePoints}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. PRODUCT BACKLOG (Unassigned Issues) */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
        <div className="bg-muted/40 px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleExpand("backlog")}
              className="text-foreground hover:text-primary transition-colors"
            >
              {expandedSprints["backlog"] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Product Backlog
              </h3>
              <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                {backlogIssues.length} issues
              </Badge>
            </div>
          </div>
        </div>

        {expandedSprints["backlog"] && (
          <div className="p-3 space-y-2">
            {backlogIssues.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Backlog is empty. All issues have been scheduled into sprints!
              </div>
            ) : (
              backlogIssues.map((issue) => (
                <SprintIssueRow
                  key={issue.id}
                  issue={issue}
                  sprints={sprints}
                  onMove={handleMoveIssue}
                  onUpdatePoints={handleUpdatePoints}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SprintIssueRow({
  issue,
  sprints,
  onMove,
  onUpdatePoints,
}: {
  issue: any;
  sprints: any[];
  onMove: (issueId: string, sprintId: string | null) => void;
  onUpdatePoints: (issueId: string, pts: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-card/60 hover:bg-muted/30 transition-all text-xs">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-[11px] font-bold text-primary shrink-0">
          {issue.key}
        </span>

        <span className="text-foreground font-semibold truncate">
          {issue.title}
        </span>

        {issue.type === "BUG" && (
          <Badge variant="destructive" className="text-[9px] py-0 shrink-0">
            BUG
          </Badge>
        )}

        {issue.labels?.map((l: any) => (
          <span
            key={l.label?.id || l.id}
            className="text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 border"
            style={{
              backgroundColor: `${l.label?.color || "#3b82f6"}15`,
              borderColor: `${l.label?.color || "#3b82f6"}40`,
              color: l.label?.color || "#3b82f6",
            }}
          >
            {l.label?.name || l.name}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Story points quick input */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-muted-foreground text-[10px]">pts:</span>
          <input
            type="number"
            defaultValue={issue.storyPoints ?? ""}
            placeholder="-"
            min="0"
            max="100"
            onBlur={(e) => onUpdatePoints(issue.id, e.target.value)}
            className="w-10 h-6 text-center border rounded bg-background font-mono text-xs focus:ring-1 focus:ring-primary outline-hidden"
          />
        </div>

        {/* Move to sprint dropdown */}
        <select
          value={issue.sprintId || ""}
          onChange={(e) => onMove(issue.id, e.target.value || null)}
          className="h-6 bg-background border rounded px-1.5 text-[11px] text-foreground"
        >
          <option value="">Backlog</option>
          {sprints
            .filter((s) => s.status !== "COMPLETED")
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
