import { Badge } from "@/components/ui/badge";
import {
  Bug,
  CheckSquare,
  Sparkles,
  Zap,
  AlertCircle,
  AlertOctagon,
  Info,
  ShieldAlert,
} from "lucide-react";

export function IssueTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "BUG":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <Bug className="h-3 w-3" />
          Bug
        </span>
      );
    case "FEATURE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Sparkles className="h-3 w-3" />
          Feature
        </span>
      );
    case "TASK":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <CheckSquare className="h-3 w-3" />
          Task
        </span>
      );
    case "IMPROVEMENT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Zap className="h-3 w-3" />
          Improvement
        </span>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function IssueStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "OPEN":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Open
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          In Progress
        </span>
      );
    case "IN_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          In Review
        </span>
      );
    case "RESOLVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Resolved
        </span>
      );
    case "CLOSED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border border-zinc-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          Closed
        </span>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function IssueSeverityBadge({ severity }: { severity?: string | null }) {
  if (!severity) return null;

  switch (severity) {
    case "BLOCKER":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-700 text-white shadow-xs">
          <ShieldAlert className="h-3 w-3" />
          Blocker
        </span>
      );
    case "CRITICAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white shadow-xs">
          <ShieldAlert className="h-3 w-3" />
          Critical
        </span>
      );
    case "MAJOR":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">
          <AlertOctagon className="h-3 w-3" />
          Major
        </span>
      );
    case "MODERATE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <AlertCircle className="h-3 w-3" />
          Moderate
        </span>
      );
    case "MINOR":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
          <Info className="h-3 w-3" />
          Minor
        </span>
      );
    case "TRIVIAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-border">
          <Info className="h-3 w-3" />
          Trivial
        </span>
      );
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
}

export function IssuePriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;

  switch (priority) {
    case "CRITICAL":
    case "URGENT":
      return (
        <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />{" "}
          {priority === "CRITICAL" ? "Critical" : "Urgent"}
        </span>
      );
    case "HIGH":
      return (
        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> High
        </span>
      );
    case "MEDIUM":
      return (
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Medium
        </span>
      );
    case "LOW":
      return (
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> Low
        </span>
      );
    case "LOWEST":
      return (
        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-300" /> Lowest
        </span>
      );
    default:
      return <span>{priority}</span>;
  }
}
