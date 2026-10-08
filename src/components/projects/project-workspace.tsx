"use client";

import { useState } from "react";
import Link from "next/link";
import { KanbanBoard } from "./kanban-board";
import { IssueListView } from "./issue-list-view";
import { BacklogView } from "./backlog-view";
import { AnalyticsView } from "./analytics-view";
import { IntegrationsView } from "./integrations-view";
import { CreateIssueDialog } from "./create-issue-dialog";
import {
  Kanban,
  ListOrdered,
  Layers,
  BarChart3,
  Workflow,
  ShieldAlert,
  CheckCircle2,
  Timer,
  Calendar,
  Tag,
} from "lucide-react";

type ProjectWorkspaceProps = {
  project: {
    id: string;
    name: string;
    key: string;
    description: string | null;
    category: string;
    milestones: Array<{ id: string; name: string }>;
  };
  issues: any[];
  users: any[];
  analytics: any;
  defaultTab?: "board" | "list" | "backlog" | "analytics" | "integrations";
};

export function ProjectWorkspace({
  project,
  issues,
  users,
  analytics,
  defaultTab = "board",
}: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "board" | "list" | "backlog" | "analytics" | "integrations"
  >(defaultTab);

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Secondary Project Toolbar with Responsive Navigation */}
      <div className="border-b border-border/60 px-4 sm:px-6 lg:px-8 py-2.5 bg-background/90 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky top-0 z-20">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 overflow-x-auto custom-scrollbar max-w-full">
          <button
            onClick={() => setActiveTab("board")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "board"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            Kanban Board
            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.2 rounded font-bold">
              {issues.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("backlog")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "backlog"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Backlog
          </button>

          <Link
            href={`/projects/${project.id}/sprints`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
          >
            <Timer className="h-3.5 w-3.5" />
            Scrum Sprints
          </Link>

          <Link
            href={`/projects/${project.id}/roadmap`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
          >
            <Calendar className="h-3.5 w-3.5" />
            Roadmap
          </Link>

          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "list"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Issue Navigator
          </button>

          <Link
            href={`/projects/${project.id}/reports`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Velocity & Reports
          </Link>

          <Link
            href={`/projects/${project.id}/releases`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
          >
            <Tag className="h-3.5 w-3.5" />
            Releases
          </Link>

          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "integrations"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Workflow className="h-3.5 w-3.5" />
            Zoho / Jira Sync
          </button>
        </div>

        {/* Create Defect Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <CreateIssueDialog
            projectId={project.id}
            users={users}
            milestones={project.milestones}
          />
        </div>
      </div>

      {/* Main Tab Content Container */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
        {activeTab === "board" && (
          <KanbanBoard
            projectId={project.id}
            initialIssues={issues}
            users={users}
          />
        )}
        {activeTab === "backlog" && (
          <BacklogView project={project} initialIssues={issues} users={users} />
        )}
        {activeTab === "list" && (
          <IssueListView issues={issues} users={users} />
        )}
        {activeTab === "analytics" && <AnalyticsView data={analytics} />}
        {activeTab === "integrations" && <IntegrationsView />}
      </div>
    </div>
  );
}
