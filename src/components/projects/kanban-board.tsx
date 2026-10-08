"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateIssueStatus } from "@/app/actions/issues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IssueTypeBadge,
  IssueSeverityBadge,
  IssuePriorityBadge,
} from "@/components/common/issue-badges";
import { IssueDetailDialog } from "./issue-detail-dialog";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  MessageSquare,
  Calendar,
  ShieldAlert,
  Tag,
  ExternalLink,
  X,
  CheckCircle2,
} from "lucide-react";

type Issue = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  severity?: string | null;
  module?: string;
  reproducibility?: string;
  environment?: string;
  dueDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  projectId: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string | null;
    role?: string;
  } | null;
  reporter?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  milestone?: {
    id: string;
    name: string;
  } | null;
  labels?: Array<{
    id?: string;
    name?: string;
    color?: string;
    label?: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: Date | string;
    author: {
      name: string;
      avatar?: string | null;
      role?: string;
    };
  }>;
};

const COLUMNS = [
  {
    id: "BACKLOG",
    title: "Backlog",
    color: "border-t-slate-400",
    dot: "bg-slate-400",
  },
  {
    id: "TODO",
    title: "To Do",
    color: "border-t-blue-500",
    dot: "bg-blue-500",
  },
  {
    id: "IN_PROGRESS",
    title: "In Progress",
    color: "border-t-amber-500",
    dot: "bg-amber-500",
  },
  {
    id: "CODE_REVIEW",
    title: "Code Review",
    color: "border-t-purple-500",
    dot: "bg-purple-500",
  },
  { id: "QA", title: "QA", color: "border-t-pink-500", dot: "bg-pink-500" },
  {
    id: "DONE",
    title: "Done",
    color: "border-t-emerald-500",
    dot: "bg-emerald-500",
  },
];

export function KanbanBoard({
  projectId,
  initialIssues,
  users = [],
}: {
  projectId: string;
  initialIssues: Issue[];
  users?: any[];
}) {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [mobileActiveStage, setMobileActiveStage] = useState<string>("ALL");

  const isFiltered = search.trim() !== "" || selectedSeverity !== "ALL";

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !issue.key.toLowerCase().includes(q) &&
        !issue.title.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (selectedSeverity !== "ALL" && issue.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  // Handle stage movement
  async function handleMove(issueId: string, newStatus: string) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)),
    );

    try {
      await updateIssueStatus(issueId, newStatus);
      router.refresh();
    } catch (err) {
      console.error("Failed to move issue stage:", err);
      setIssues(initialIssues);
    }
  }

  const columnOrder = COLUMNS.map((c) => c.id);

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search board defects by key or title..."
              className="pl-9 h-9 text-xs bg-background rounded-lg border-input"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="MAJOR">Major</option>
            <option value="MODERATE">Moderate</option>
            <option value="MINOR">Minor</option>
          </select>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearch("");
                setSelectedSeverity("ALL");
              }}
            >
              <X className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-medium shrink-0">
          Total Cards:{" "}
          <span className="font-bold text-foreground">
            {filteredIssues.length}
          </span>
        </div>
      </div>

      {/* Mobile Stage Selector Tabs (< 768px) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setMobileActiveStage("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            mobileActiveStage === "ALL"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          All Stages ({filteredIssues.length})
        </button>
        {COLUMNS.map((col) => {
          const count = filteredIssues.filter(
            (i) => i.status === col.id,
          ).length;
          return (
            <button
              key={col.id}
              onClick={() => setMobileActiveStage(col.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                mobileActiveStage === col.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${col.dot}`} />
              {col.title} ({count})
            </button>
          );
        })}
      </div>

      {/* Kanban Columns Grid */}
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar min-h-[550px] snap-x snap-mandatory">
        {COLUMNS.map((column, colIndex) => {
          if (mobileActiveStage !== "ALL" && mobileActiveStage !== column.id) {
            return null;
          }

          const colIssues = filteredIssues.filter(
            (i) => i.status === column.id,
          );

          return (
            <div
              key={column.id}
              className={`${
                mobileActiveStage === "ALL"
                  ? "w-[82vw] sm:w-80 shrink-0 snap-center"
                  : "w-full sm:w-80 shrink-0"
              } bg-muted/30 rounded-xl p-3 border border-border/60 border-t-4 ${column.color} flex flex-col justify-between`}
            >
              <div className="space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${column.dot}`}
                    />
                    <h3 className="font-bold text-xs text-foreground uppercase tracking-wide">
                      {column.title}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-background border border-border px-2 py-0.5 rounded-full text-muted-foreground shadow-2xs">
                    {colIssues.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5">
                  {colIssues.map((issue) => (
                    <Card
                      key={issue.id}
                      onClick={() => {
                        setSelectedIssue(issue);
                        setIsDetailOpen(true);
                      }}
                      className="bg-card hover:border-primary/50 transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer group active:scale-[0.99] border-border/60"
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Header: Key & Severity */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-xs text-primary group-hover:underline">
                            {issue.key}
                          </span>
                          <IssueSeverityBadge severity={issue.severity} />
                        </div>

                        {/* Title */}
                        <div className="font-semibold text-xs text-foreground leading-snug line-clamp-2">
                          {issue.title}
                        </div>

                        {/* Badges: Type & Priority */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <IssueTypeBadge type={issue.type} />
                          <IssuePriorityBadge priority={issue.priority} />
                        </div>

                        {/* Footer: Assignee & Stage Shift Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            {issue.assignee ? (
                              <div
                                className="flex items-center gap-1.5"
                                title={`Assigned to ${issue.assignee.name}`}
                              >
                                <Avatar className="h-5 w-5">
                                  <AvatarImage
                                    src={issue.assignee.avatar || ""}
                                  />
                                  <AvatarFallback className="text-[9px]">
                                    {issue.assignee.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                                  {issue.assignee.name.split(" ")[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                Unassigned
                              </span>
                            )}

                            {issue.comments && issue.comments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                {issue.comments.length}
                              </span>
                            )}
                          </div>

                          {/* Move stage control */}
                          <div className="flex items-center gap-0.5">
                            {colIndex > 0 && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                                title={`Move back to ${COLUMNS[colIndex - 1].title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMove(
                                    issue.id,
                                    columnOrder[colIndex - 1],
                                  );
                                }}
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                            )}
                            {colIndex < columnOrder.length - 1 && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                                title={`Advance to ${COLUMNS[colIndex + 1].title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMove(
                                    issue.id,
                                    columnOrder[colIndex + 1],
                                  );
                                }}
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {colIssues.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground bg-card/20">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground/30 mb-1.5" />
                      <p className="text-xs font-semibold text-foreground/80">
                        No issues in {column.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        All clear in this workflow stage
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Issue Detail Dialog */}
      <IssueDetailDialog
        issue={selectedIssue as any}
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) setSelectedIssue(null);
        }}
        users={users}
      />
    </div>
  );
}
