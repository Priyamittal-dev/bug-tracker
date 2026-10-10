"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IssueTypeBadge,
  IssueSeverityBadge,
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/common/issue-badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Filter,
  FolderKanban,
  MessageSquare,
  Calendar,
  Tag,
  ExternalLink,
  ArrowUpDown,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
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
  dueDate?: Date | string | null;
  createdAt: Date | string;
  projectId: string;
  project?: {
    id: string;
    key: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  reporter?: {
    id: string;
    name: string;
    avatar?: string | null;
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
  comments?: any[];
};

type GlobalIssuesViewProps = {
  initialIssues: Issue[];
  projects: Array<{ id: string; key: string; name: string }>;
};

export function GlobalIssuesView({
  initialIssues,
  projects,
}: GlobalIssuesViewProps) {
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const isFiltered =
    search.trim() !== "" ||
    selectedProjectId !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedPriority !== "ALL" ||
    selectedType !== "ALL";

  const filteredIssues = initialIssues.filter((issue) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchKey = issue.key.toLowerCase().includes(q);
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchModule = (issue.module || "").toLowerCase().includes(q);
      if (!matchKey && !matchTitle && !matchModule) return false;
    }

    if (selectedProjectId !== "ALL" && issue.projectId !== selectedProjectId)
      return false;
    if (selectedStatus !== "ALL" && issue.status !== selectedStatus)
      return false;
    if (selectedPriority !== "ALL" && issue.priority !== selectedPriority)
      return false;
    if (selectedType !== "ALL" && issue.type !== selectedType) return false;

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredIssues.length);
  const paginatedIssues = filteredIssues.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="bg-card border border-border/60 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search across all project issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          <div className="text-xs text-muted-foreground font-medium shrink-0">
            Showing{" "}
            <span className="font-bold text-foreground">
              {filteredIssues.length}
            </span>{" "}
            of {initialIssues.length} issues
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CODE_REVIEW">Code Review</option>
            <option value="QA">QA</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="LOWEST">Lowest</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Types</option>
            <option value="EPIC">Epic</option>
            <option value="STORY">Story</option>
            <option value="TASK">Task</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
            <option value="IMPROVEMENT">Improvement</option>
          </select>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 col-span-2 sm:col-span-1"
              onClick={() => {
                setSearch("");
                setSelectedProjectId("ALL");
                setSelectedStatus("ALL");
                setSelectedPriority("ALL");
                setSelectedType("ALL");
              }}
            >
              <X className="h-3.5 w-3.5" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Card List View (< 768px) */}
      <div className="md:hidden space-y-2.5">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all shadow-2xs space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/issues/${issue.id}`}
                  className="font-mono text-xs font-bold text-primary hover:underline"
                >
                  {issue.key}
                </Link>
                <IssueTypeBadge type={issue.type} />
              </div>
              <IssuePriorityBadge priority={issue.priority} />
            </div>

            <Link
              href={`/issues/${issue.id}`}
              className="font-bold text-xs text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors block"
            >
              {issue.title}
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
              <div className="flex items-center gap-2">
                <IssueStatusBadge status={issue.status} />
                {issue.project && (
                  <span className="text-muted-foreground font-medium text-[10px]">
                    {issue.project.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {issue.assignee ? (
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={issue.assignee.avatar || ""} />
                      <AvatarFallback className="text-[8px]">
                        {issue.assignee.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">
                      {issue.assignee.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">
                    Unassigned
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredIssues.length === 0 && (
          <div className="py-12 px-4 text-center border-2 border-dashed border-border/60 rounded-xl bg-card/40 space-y-2">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-xs font-medium text-foreground">
              No issues match the search query
            </p>
            <p className="text-[11px] text-muted-foreground">
              Try adjusting your filters or search keywords
            </p>
          </div>
        )}
      </div>

      {/* Desktop Issues Table (>= 768px) */}
      <div className="hidden md:block bg-card border border-border/60 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[900px] divide-y divide-border/60">
            {/* Table Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 text-[11px] font-bold text-muted-foreground">
              <div className="w-28 shrink-0 font-mono">Key</div>
              <div className="w-32 shrink-0">Project</div>
              <div className="w-28 shrink-0">Type</div>
              <div className="flex-1 min-w-[200px]">Title</div>
              <div className="w-28 shrink-0 text-center">Status</div>
              <div className="w-24 shrink-0 text-center">Priority</div>
              <div className="w-32 shrink-0">Assignee</div>
              <div className="w-24 shrink-0 text-right">Created</div>
            </div>

            {/* Rows */}
            {paginatedIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-muted/40 transition-colors group"
              >
                {/* Key */}
                <div className="w-28 shrink-0 font-mono font-bold text-primary">
                  <Link
                    href={`/issues/${issue.id}`}
                    className="hover:underline flex items-center gap-1"
                  >
                    {issue.key}
                    <ExternalLink className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>

                {/* Project */}
                <div className="w-32 shrink-0 truncate">
                  {issue.project ? (
                    <Link
                      href={`/projects/${issue.project.id}`}
                      className="text-muted-foreground hover:text-foreground font-medium truncate flex items-center gap-1"
                    >
                      <FolderKanban className="h-3 w-3 shrink-0" />
                      <span className="truncate">{issue.project.name}</span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground/60">?</span>
                  )}
                </div>

                {/* Type */}
                <div className="w-28 shrink-0">
                  <IssueTypeBadge type={issue.type} />
                </div>

                {/* Title & Labels */}
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <Link
                    href={`/issues/${issue.id}`}
                    className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1"
                  >
                    {issue.title}
                  </Link>

                  {issue.comments && issue.comments.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto pr-2 shrink-0">
                      <MessageSquare className="h-3 w-3" />
                      {issue.comments.length}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="w-28 shrink-0 text-center">
                  <IssueStatusBadge status={issue.status} />
                </div>

                {/* Priority */}
                <div className="w-24 shrink-0 text-center">
                  <IssuePriorityBadge priority={issue.priority} />
                </div>

                {/* Assignee */}
                <div className="w-32 shrink-0 flex items-center gap-1.5">
                  {issue.assignee ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={issue.assignee.avatar || ""} />
                        <AvatarFallback className="text-[9px]">
                          {issue.assignee.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground truncate max-w-[85px] text-[11px]">
                        {issue.assignee.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/60 italic text-[11px]">
                      Unassigned
                    </span>
                  )}
                </div>

                {/* Created At */}
                <div
                  className="w-24 shrink-0 text-right text-[11px] text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(issue.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}

            {filteredIssues.length === 0 && (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <Layers className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  No issues match the search query
                </p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your filters or search keywords
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Toolbar */}
        {filteredIssues.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border-t border-border/60 text-xs">
            <div className="text-muted-foreground flex items-center gap-2">
              <span>
                Showing <strong className="text-foreground">{startIndex + 1}</strong> to{" "}
                <strong className="text-foreground">{endIndex}</strong> of{" "}
                <strong className="text-foreground">{filteredIssues.length}</strong> issues
              </span>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded border border-input bg-background px-1.5 text-xs font-medium focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="text-muted-foreground font-medium px-2">
                Page <strong className="text-foreground">{currentPage}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 px-2.5 text-xs gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
