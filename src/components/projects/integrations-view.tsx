"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  RefreshCw,
  GitPullRequest,
  MessageSquare,
  ExternalLink,
  Zap,
  ShieldCheck,
  ArrowRightLeft,
  Send,
} from "lucide-react";

export function IntegrationsView() {
  const [syncStatus, setSyncStatus] = useState<Record<string, boolean>>({
    zoho: true,
    jira: true,
    github: true,
    slack: true,
  });

  const [testLog, setTestLog] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  function toggleIntegration(key: string) {
    setSyncStatus((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function simulateWebhookTest() {
    setTesting(true);
    setTimeout(() => {
      setTestLog(
        JSON.stringify(
          {
            event: "defect.status_changed",
            timestamp: new Date().toISOString(),
            defect: {
              key: "CLOUD-101",
              title: "WebSocket session memory leak",
              old_status: "OPEN",
              new_status: "IN_PROGRESS",
              assignee: "Priyanka Devi",
              severity: "CRITICAL",
            },
            zoho_sync: "SUCCESS (HTTP 200)",
            jira_sync: "SUCCESS (Mapped to JIRA-4091)",
          },
          null,
          2,
        ),
      );
      setTesting(false);
    }, 600);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            Connected Ecosystem & Integrations
          </h2>
          <p className="text-xs text-muted-foreground">
            Synchronize defects, commits, and alerts across Zoho BugTracker,
            Jira Cloud, and GitHub.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-xs"
          onClick={simulateWebhookTest}
          disabled={testing}
        >
          <Send className="h-3.5 w-3.5 text-primary" />
          {testing ? "Testing Webhook..." : "Test Webhook Dispatch"}
        </Button>
      </div>

      {testLog && (
        <div className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>⚡ Live Webhook Event Dispatch Test Result</span>
            <button
              onClick={() => setTestLog(null)}
              className="hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <pre className="text-emerald-400 whitespace-pre-wrap">{testLog}</pre>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zoho BugTracker & Desk */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 font-bold font-mono text-sm">
                  ZOHO
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">
                    Zoho BugTracker & Desk Sync
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bi-directional sync with Zoho Desk tickets and Zoho Projects
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={syncStatus.zoho ? "default" : "outline"}
                className="text-[10px]"
              >
                {syncStatus.zoho ? "Active" : "Paused"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="p-2.5 rounded-md bg-muted/40 border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Sync Frequency:</span>
                <strong className="text-foreground">
                  Real-time Webhook (0s latency)
                </strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Connected Workspace:</span>
                <strong className="text-foreground">
                  zoho-ent.enterprise.com/bugs
                </strong>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => toggleIntegration("zoho")}
              >
                {syncStatus.zoho ? "Pause Sync" : "Resume Sync"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jira Cloud Sync */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 font-bold font-mono text-sm">
                  JIRA
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">
                    Atlassian Jira Software Cloud
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Import and map epics, user stories, and Jira bug keys
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={syncStatus.jira ? "default" : "outline"}
                className="text-[10px]"
              >
                {syncStatus.jira ? "Active" : "Paused"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="p-2.5 rounded-md bg-muted/40 border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Target Project:</span>
                <strong className="text-foreground">
                  Jira Software (PROD-BOARD)
                </strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Key Mapping:</span>
                <strong className="text-foreground">
                  Auto prefix translation enabled
                </strong>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => toggleIntegration("jira")}
              >
                {syncStatus.jira ? "Pause Sync" : "Resume Sync"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* GitHub / GitLab Sync */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 font-bold font-mono text-sm">
                  <GitPullRequest className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">
                    GitHub Repository CI/CD
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Auto-link pull requests and close defects via commit tags
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={syncStatus.github ? "default" : "outline"}
                className="text-[10px]"
              >
                {syncStatus.github ? "Active" : "Paused"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="p-2.5 rounded-md bg-muted/40 border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Repository:</span>
                <strong className="text-foreground">
                  Priyamittal-dev/bug-tracker
                </strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Smart Commits:</span>
                <strong className="text-foreground">
                  "fixes #KEY" triggers Resolved
                </strong>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => toggleIntegration("github")}
              >
                {syncStatus.github ? "Pause Sync" : "Resume Sync"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Slack / MS Teams */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 font-bold font-mono text-sm">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">
                    Slack Blocker Alerts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Broadcast critical defects directly to engineering war room
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={syncStatus.slack ? "default" : "outline"}
                className="text-[10px]"
              >
                {syncStatus.slack ? "Active" : "Paused"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="p-2.5 rounded-md bg-muted/40 border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Alert Channel:</span>
                <strong className="text-foreground">
                  #critical-bugs-war-room
                </strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Trigger Severity:</span>
                <strong className="text-foreground">
                  CRITICAL & MAJOR only
                </strong>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => toggleIntegration("slack")}
              >
                {syncStatus.slack ? "Pause Sync" : "Resume Sync"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
