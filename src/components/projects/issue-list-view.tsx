"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IssueTypeBadge,
  IssueSeverityBadge,
  IssueStatusBadge,
  IssuePriorityBadge,
} from "@/components/common/issue-badges";
import { IssueDetailDialog } from "./issue-detail-dialog";
import {
  Search,
  Filter,
  ArrowUpDown,
  MessageSquare,
  Calendar,
  X,
  ExternalLink,
} from "lucide-react";

type Issue = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  severity: string;
  module: string;
  reproducibility: string;
  environment: string;
  dueDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  projectId: string;
  assignee?: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  } | null;
  reporter?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: Date | string;
    author: {
      name: string;
      avatar: string | null;
      role: string;
    };
  }>;
};

export function IssueListView({
  issues,
  users = [],
}: {
  issues: Issue[];
  users?: any[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<
    "key" | "severity" | "priority" | "date"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const isFiltered =
    search.trim() !== "" || statusFilter !== "ALL" || severityFilter !== "ALL";

  const filtered = issues
    .filter((i) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !i.key.toLowerCase().includes(q) &&
          !i.title.toLowerCase().includes(q) &&
          !(i.module || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
      if (severityFilter !== "ALL" && i.severity !== severityFilter)
        return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "key") return a.key.localeCompare(b.key) * dir;
      if (sortBy === "date")
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          dir
        );
      if (sortBy === "severity") {
        const order = {
          CRITICAL: 4,
          MAJOR: 3,
          MODERATE: 2,
          MINOR: 1,
          TRIVIAL: 0,
        };
        return (
          ((order[a.severity as keyof typeof order] || 0) -
            (order[b.severity as keyof typeof order] || 0)) *
          dir
        );
      }
      return 0;
    });

  function toggleSort(field: "key" | "severity" | "priority" | "date") {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search defects by key, title, module..."
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
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
                setStatusFilter("ALL");
                setSeverityFilter("ALL");
              }}
            >
              <X className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground shrink-0 font-medium">
          Showing{" "}
          <span className="text-foreground font-bold">{filtered.length}</span>{" "}
          of {issues.length} defects
        </div>
      </div>

      {/* Mobile Card View (< 768px) */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((issue) => (
          <div
            key={issue.id}
            onClick={() => {
              setSelectedIssue(issue);
              setIsDetailOpen(true);
            }}
            className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all shadow-2xs space-y-2 cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">
                  {issue.key}
                </span>
                <IssueTypeBadge type={issue.type} />
              </div>
              <IssueSeverityBadge severity={issue.severity} />
            </div>

            <div className="font-bold text-xs text-foreground leading-snug line-clamp-2">
              {issue.title}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
              <IssueStatusBadge status={issue.status} />

              <div className="flex items-center gap-2 text-muted-foreground">
                {issue.assignee ? (
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={issue.assignee.avatar || ""} />
                      <AvatarFallback className="text-[8px]">
                        {issue.assignee.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] truncate max-w-[70px]">
                      {issue.assignee.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] italic">Unassigned</span>
                )}

                {issue.comments && issue.comments.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    <MessageSquare className="h-3 w-3" />
                    {issue.comments.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 px-4 text-center border-2 border-dashed border-border/60 rounded-xl bg-card/40">
            <p className="text-xs text-muted-foreground italic">
              No defects match your criteria.
            </p>
          </div>
        )}
      </div>

      {/* Desktop Enterprise Table (>= 768px) */}
      <div className="hidden md:block rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/40 text-xs">
              <TableRow>
                <TableHead
                  className="w-[110px] cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("key")}
                >
                  <div className="flex items-center gap-1 font-bold">
                    Key <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[90px] font-bold">Type</TableHead>
                <TableHead className="font-bold">
                  Summary / Defect Title
                </TableHead>
                <TableHead className="w-[120px] font-bold">Status</TableHead>
                <TableHead
                  className="w-[110px] cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("severity")}
                >
                  <div className="flex items-center gap-1 font-bold">
                    Severity <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px] font-bold">Priority</TableHead>
                <TableHead className="w-[110px] font-bold">Module</TableHead>
                <TableHead className="w-[130px] font-bold">Assignee</TableHead>
                <TableHead className="w-[90px] font-bold text-right">
                  Due Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filtered.map((issue) => (
                <TableRow
                  key={issue.id}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setIsDetailOpen(true);
                  }}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-mono font-bold text-primary">
                    {issue.key}
                  </TableCell>
                  <TableCell>
                    <IssueTypeBadge type={issue.type} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[320px] text-foreground hover:underline">
                        {issue.title}
                      </span>
                      {issue.comments && issue.comments.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {issue.comments.length}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <IssueStatusBadge status={issue.status} />
                  </TableCell>
                  <TableCell>
                    <IssueSeverityBadge severity={issue.severity} />
                  </TableCell>
                  <TableCell>
                    <IssuePriorityBadge priority={issue.priority} />
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded bg-muted/60 text-muted-foreground text-[11px] truncate max-w-[90px] inline-block">
                      {issue.module || "General"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {issue.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={issue.assignee.avatar || ""} />
                          <AvatarFallback className="text-[9px]">
                            {issue.assignee.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[95px] text-foreground">
                          {issue.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {issue.dueDate
                      ? new Date(issue.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No defects matching current criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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
