"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateIssueStatus, updateIssue } from "@/app/actions/issues";
import {
  IssueTypeBadge,
  IssueSeverityBadge,
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/common/issue-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  ArrowUpDown,
  CheckSquare,
  Square,
  Tag,
  ExternalLink,
  UserCheck,
  Layers,
  AlertCircle,
  Plus,
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
};

type BacklogViewProps = {
  project: {
    id: string;
    name: string;
    key: string;
  };
  initialIssues: Issue[];
  users?: Array<{
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  }>;
};

export function BacklogView({
  project,
  initialIssues,
  users = [],
}: BacklogViewProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [sortBy, setSortBy] = useState<
    "priority" | "createdAt" | "key" | "title"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Bulk selection
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const router = useRouter();

  const priorityWeights: Record<string, number> = {
    CRITICAL: 5,
    URGENT: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    LOWEST: 1,
  };

  // Filter and sort issues
  const filteredIssues = issues
    .filter((issue) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchKey = issue.key.toLowerCase().includes(q);
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchDesc = issue.description?.toLowerCase().includes(q) || false;
        if (!matchKey && !matchTitle && !matchDesc) return false;
      }
      if (filterStatus !== "ALL" && issue.status !== filterStatus) return false;
      if (filterPriority !== "ALL" && issue.priority !== filterPriority)
        return false;
      if (filterType !== "ALL" && issue.type !== filterType) return false;
      if (filterAssignee !== "ALL") {
        if (filterAssignee === "UNASSIGNED" && issue.assignee) return false;
        if (
          filterAssignee !== "UNASSIGNED" &&
          issue.assignee?.id !== filterAssignee
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const wA = priorityWeights[a.priority] || 0;
        const wB = priorityWeights[b.priority] || 0;
        return sortOrder === "desc" ? wB - wA : wA - wB;
      }
      if (sortBy === "createdAt") {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? tB - tA : tA - tB;
      }
      if (sortBy === "key") {
        return sortOrder === "desc"
          ? b.key.localeCompare(a.key)
          : a.key.localeCompare(b.key);
      }
      return sortOrder === "desc"
        ? b.title.localeCompare(a.title)
        : a.title.localeCompare(b.title);
    });

  // Bulk Selection Toggles
  function toggleSelectAll() {
    if (selectedIssueIds.length === filteredIssues.length) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(filteredIssues.map((i) => i.id));
    }
  }

  function toggleSelectOne(id: string) {
    if (selectedIssueIds.includes(id)) {
      setSelectedIssueIds(selectedIssueIds.filter((item) => item !== id));
    } else {
      setSelectedIssueIds([...selectedIssueIds, id]);
    }
  }

  async function handleQuickStatusChange(issueId: string, newStatus: string) {
    setIssues((current) =>
      current.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)),
    );
    try {
      await updateIssueStatus(issueId, newStatus);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleBulkApply() {
    if (selectedIssueIds.length === 0) return;
    setIsBulkOperating(true);

    try {
      if (bulkStatus) {
        setIssues((current) =>
          current.map((i) =>
            selectedIssueIds.includes(i.id) ? { ...i, status: bulkStatus } : i,
          ),
        );
        for (const id of selectedIssueIds) {
          await updateIssueStatus(id, bulkStatus);
        }
      }
      setSelectedIssueIds([]);
      setBulkStatus("");
      setBulkAssignee("");
      router.refresh();
    } catch (e) {
      console.error("Bulk action failed:", e);
    } finally {
      setIsBulkOperating(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 p-4 rounded-xl border">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search backlog..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="ALL">All Types</option>
            <option value="EPIC">Epic</option>
            <option value="STORY">Story</option>
            <option value="TASK">Task</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
            <option value="IMPROVEMENT">Improvement</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="key">Sort: Key</option>
            <option value="title">Sort: Title</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title={`Order: ${sortOrder.toUpperCase()}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          <span className="text-foreground font-semibold">
            {filteredIssues.length}
          </span>{" "}
          backlog items
        </div>
      </div>

      {/* Bulk Action Bar (Visible when 1+ selected) */}
      {selectedIssueIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/30 p-2.5 px-4 rounded-lg text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium text-primary">
            <CheckSquare className="h-4 w-4" />
            <span>
              {selectedIssueIds.length} item
              {selectedIssueIds.length > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="h-7 rounded border border-input bg-background px-2 text-xs"
            >
              <option value="">Move to status...</option>
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CODE_REVIEW">Code Review</option>
              <option value="QA">QA</option>
              <option value="DONE">Done</option>
            </select>

            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleBulkApply}
              disabled={isBulkOperating || !bulkStatus}
            >
              {isBulkOperating ? "Applying..." : "Apply Bulk Changes"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setSelectedIssueIds([])}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Backlog Items List */}
      <div className="bg-card border rounded-xl overflow-x-auto divide-y divide-border">
        {/* Table Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold text-muted-foreground min-w-[800px]">
          <button onClick={toggleSelectAll} className="hover:text-foreground">
            {selectedIssueIds.length > 0 &&
            selectedIssueIds.length === filteredIssues.length ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div className="w-20 font-mono">Key</div>
          <div className="w-16">Type</div>
          <div className="flex-1 min-w-[200px]">Title</div>
          <div className="w-24 text-center">Status</div>
          <div className="w-24 text-center">Priority</div>
          <div className="w-32">Assignee</div>
          <div className="w-24 text-right">Actions</div>
        </div>

        {/* Rows */}
        {filteredIssues.map((issue) => {
          const isSelected = selectedIssueIds.includes(issue.id);

          return (
            <div
              key={issue.id}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-muted/30 transition-colors min-w-[800px] ${
                isSelected ? "bg-primary/5" : ""
              }`}
            >
              <button onClick={() => toggleSelectOne(issue.id)}>
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Key */}
              <div className="w-20 font-mono font-bold text-primary">
                <Link
                  href={`/issues/${issue.id}`}
                  className="hover:underline flex items-center gap-0.5"
                >
                  {issue.key}
                  <ExternalLink className="h-2.5 w-2.5 opacity-40 hover:opacity-100" />
                </Link>
              </div>

              {/* Type */}
              <div className="w-16">
                <IssueTypeBadge type={issue.type} />
              </div>

              {/* Title & Labels */}
              <div className="flex-1 min-w-[200px] flex items-center gap-2">
                <Link
                  href={`/issues/${issue.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                >
                  {issue.title}
                </Link>

                <div className="hidden sm:flex items-center gap-1">
                  {issue.labels?.map((il, idx) => {
                    const lbl = (il as any).label || il;
                    return (
                      <span
                        key={lbl.id || idx}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium"
                        style={{
                          backgroundColor: `${lbl.color || "#6b7280"}22`,
                          color: lbl.color || "#6b7280",
                          border: `1px solid ${lbl.color || "#6b7280"}44`,
                        }}
                      >
                        {lbl.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Status Select */}
              <div className="w-24 text-center">
                <select
                  value={issue.status}
                  onChange={(e) =>
                    handleQuickStatusChange(issue.id, e.target.value)
                  }
                  className="h-6 text-[11px] rounded border border-input bg-background px-1 max-w-[95px]"
                >
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="CODE_REVIEW">Review</option>
                  <option value="QA">QA</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div className="w-24 text-center">
                <IssuePriorityBadge priority={issue.priority} />
              </div>

              {/* Assignee */}
              <div className="w-32 flex items-center gap-1.5">
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

              {/* Quick Actions */}
              <div className="w-24 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  render={<Link href={`/issues/${issue.id}`} />}
                >
                  View
                </Button>
              </div>
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">
              No backlog items match the filters
            </p>
            <p className="text-xs text-muted-foreground/70">
              Create a new issue or adjust your search filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
