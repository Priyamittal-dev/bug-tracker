"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShieldAlert,
  CheckCircle2,
  CircleDashed,
  Activity,
  Layers,
  Users,
  BarChart3,
  AlertOctagon,
  TrendingUp,
} from "lucide-react";

type AnalyticsData = {
  total: number;
  open: number;
  inProgress: number;
  inReview: number;
  resolved: number;
  closed: number;
  activeDefects: number;
  resolvedDefects: number;
  resolutionRate: number;
  severity: {
    critical: number;
    major: number;
    moderate: number;
    minor: number;
  };
  priority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  moduleBreakdown: Array<{ module: string; count: number }>;
  assigneeWorkload: Array<{
    name: string;
    avatar: string | null;
    count: number;
    resolved: number;
  }>;
};

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const { total, resolutionRate, severity, moduleBreakdown, assigneeWorkload } =
    data;

  const getPercent = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Logged Defects
            </CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all project components
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Critical Blockers
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-red-600">
              {severity.critical}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate engineering hotfix
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active In-Pipeline
            </CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600">
              {data.activeDefects}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.open} open • {data.inProgress} in progress • {data.inReview}{" "}
              review
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resolution Rate
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600">
              {resolutionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.resolvedDefects} of {total} defects resolved/closed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Severity Distribution & Status Flow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-500" />
              Defect Severity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Critical */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> Critical
                  (Blocker / Crash)
                </span>
                <span className="font-semibold">
                  {severity.critical} ({getPercent(severity.critical)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-red-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${getPercent(severity.critical)}%` }}
                />
              </div>
            </div>

            {/* Major */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-orange-600">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> Major
                  (High Impact)
                </span>
                <span className="font-semibold">
                  {severity.major} ({getPercent(severity.major)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-orange-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${getPercent(severity.major)}%` }}
                />
              </div>
            </div>

            {/* Moderate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Moderate
                  (Normal Defect)
                </span>
                <span className="font-semibold">
                  {severity.moderate} ({getPercent(severity.moderate)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${getPercent(severity.moderate)}%` }}
                />
              </div>
            </div>

            {/* Minor */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" /> Minor
                  (Cosmetic / Trivial)
                </span>
                <span className="font-semibold">
                  {severity.minor} ({getPercent(severity.minor)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-zinc-400 h-2.5 rounded-full transition-all"
                  style={{ width: `${getPercent(severity.minor)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Flow Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Workflow Pipeline Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-blue-600 font-semibold">
                  Open Backlog
                </span>
                <span>
                  {data.open} ({getPercent(data.open)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{ width: `${getPercent(data.open)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-amber-600 font-semibold">
                  In Progress
                </span>
                <span>
                  {data.inProgress} ({getPercent(data.inProgress)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full"
                  style={{ width: `${getPercent(data.inProgress)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-purple-600 font-semibold">
                  In QA Review
                </span>
                <span>
                  {data.inReview} ({getPercent(data.inReview)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-2.5 rounded-full"
                  style={{ width: `${getPercent(data.inReview)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-600 font-semibold">
                  Resolved & Closed
                </span>
                <span>
                  {data.resolvedDefects} ({getPercent(data.resolvedDefects)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full"
                  style={{ width: `${getPercent(data.resolvedDefects)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Module Hotspots & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Defects by Module / Component Hotspot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {moduleBreakdown.map((m) => (
                <div
                  key={m.module}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border"
                >
                  <span className="font-semibold text-foreground">
                    {m.module}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-28 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${getPercent(m.count)}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold w-6 text-right">
                      {m.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Team Workload & Resolution Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assigneeWorkload.map((engineer) => (
                <div
                  key={engineer.name}
                  className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/30 border"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={engineer.avatar || ""} />
                      <AvatarFallback>{engineer.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">
                        {engineer.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {engineer.resolved} resolved of {engineer.count}{" "}
                        assigned
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-primary/10 text-primary">
                      {engineer.count} bugs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
