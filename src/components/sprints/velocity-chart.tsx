"use client";

import { Zap } from "lucide-react";

type VelocityData = {
  projectId: string;
  completedSprintCount: number;
  averageVelocity: number;
  sprints: Array<{
    sprintId: string;
    name: string;
    committedPoints: number;
    completedPoints: number;
    completedAt: any;
  }>;
};

export function VelocityChart({ data }: { data: VelocityData | null }) {
  if (!data || !data.sprints || data.sprints.length === 0) {
    return (
      <div className="p-8 text-center border rounded-xl bg-card/40 text-muted-foreground text-xs">
        <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        No completed sprints yet. Velocity metrics are computed automatically
        once sprints are completed.
      </div>
    );
  }

  const { sprints, averageVelocity } = data;
  const maxPts = Math.max(
    ...sprints.map((s) => Math.max(s.committedPoints, s.completedPoints)),
    15,
  );

  return (
    <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">
              Team Velocity Tracking
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Committed capacity vs actual completed story points across past
            sprints
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-lg border border-amber-500/20 text-xs">
            <span className="text-muted-foreground mr-1">Avg Velocity:</span>
            <span className="font-mono font-black text-sm">
              {averageVelocity} pts / sprint
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />
              <span className="text-muted-foreground">Committed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
              <span className="font-semibold text-foreground">Delivered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
        {sprints.map((s) => {
          const committedHeight = Math.max(
            8,
            Math.round((s.committedPoints / maxPts) * 120),
          );
          const completedHeight = Math.max(
            8,
            Math.round((s.completedPoints / maxPts) * 120),
          );

          return (
            <div
              key={s.sprintId}
              className="flex flex-col items-center bg-muted/20 p-3 rounded-lg border"
            >
              <div className="h-32 w-full flex items-end justify-center gap-1.5 pb-2">
                {/* Committed bar */}
                <div
                  style={{ height: `${committedHeight}px` }}
                  className="w-5 bg-muted-foreground/30 rounded-t-sm transition-all hover:bg-muted-foreground/50 relative group"
                  title={`Committed: ${s.committedPoints} pts`}
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9px] bg-popover px-1 rounded shadow-xs text-foreground">
                    {s.committedPoints}
                  </span>
                </div>

                {/* Completed bar */}
                <div
                  style={{ height: `${completedHeight}px` }}
                  className="w-5 bg-primary rounded-t-sm transition-all hover:bg-primary/80 relative group"
                  title={`Delivered: ${s.completedPoints} pts`}
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9px] bg-popover px-1 rounded shadow-xs text-foreground font-bold">
                    {s.completedPoints}
                  </span>
                </div>
              </div>

              <div className="text-center border-t pt-2 w-full">
                <span
                  className="font-bold text-xs text-foreground truncate block"
                  title={s.name}
                >
                  {s.name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {s.completedPoints} / {s.committedPoints} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
