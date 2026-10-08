"use client";

import { TrendingDown, Flame } from "lucide-react";

type BurndownData = {
  sprintId: string;
  sprintName: string;
  status: string;
  totalDays: number;
  totalPoints: number;
  burndownDays: Array<{
    day: number;
    date: string;
    idealRemaining: number;
    actualRemaining: number;
  }>;
};

export function BurndownChart({ data }: { data: BurndownData | null }) {
  if (!data || !data.burndownDays || data.burndownDays.length === 0) {
    return (
      <div className="p-8 text-center border rounded-xl bg-card/40 text-muted-foreground text-xs">
        <TrendingDown className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        No burndown data available for this sprint yet.
      </div>
    );
  }

  const { totalPoints, burndownDays, sprintName } = data;
  const maxPoints = Math.max(
    totalPoints,
    ...burndownDays.map((d) => d.actualRemaining),
    10,
  );

  // Chart dimensions
  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const daysCount = burndownDays.length - 1 || 1;

  // Coordinate scales
  const getX = (index: number) =>
    padding.left + (index / daysCount) * plotWidth;
  const getY = (points: number) =>
    padding.top + plotHeight - (points / maxPoints) * plotHeight;

  // Path generators
  const idealPath = burndownDays
    .map(
      (d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.idealRemaining)}`,
    )
    .join(" ");

  const actualPath = burndownDays
    .map(
      (d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.actualRemaining)}`,
    )
    .join(" ");

  const lastActual =
    burndownDays[burndownDays.length - 1]?.actualRemaining ?? 0;
  const currentCompleted = Math.max(0, totalPoints - lastActual);
  const percentComplete =
    totalPoints > 0 ? Math.round((currentCompleted / totalPoints) * 100) : 0;

  return (
    <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-bold text-foreground">
              Sprint Burndown: {sprintName}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trajectory of ideal story points reduction vs actual issue
            completion
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40 border border-muted-foreground" />
            <span className="text-muted-foreground">Ideal Guideline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="font-semibold text-foreground">
              Actual Remaining ({lastActual} pts)
            </span>
          </div>
          <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded font-bold border border-primary/20">
            {percentComplete}% Burnt
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-64 select-none font-sans"
        >
          {/* Y Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + plotHeight * (1 - ratio);
            const pts = Math.round(maxPoints * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="currentColor"
                  className="text-muted-foreground fill-muted-foreground font-mono"
                >
                  {pts}
                </text>
              </g>
            );
          })}

          {/* X Axis dates */}
          {burndownDays.map((d, i) => {
            // Show every other day if crowded
            if (daysCount > 10 && i % 2 !== 0 && i !== daysCount) return null;
            const x = getX(i);
            return (
              <text
                key={d.date}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="9"
                fill="currentColor"
                className="text-muted-foreground fill-muted-foreground font-mono"
              >
                {d.date.slice(5)}
              </text>
            );
          })}

          {/* Ideal Guideline */}
          <path
            d={idealPath}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeDasharray="5 5"
          />

          {/* Actual Remaining Line */}
          <path
            d={actualPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Plotted Data Dots */}
          {burndownDays.map((d, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(d.actualRemaining)}
              r="3.5"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
