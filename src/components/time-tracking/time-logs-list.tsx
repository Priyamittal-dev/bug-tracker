"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getTimeLogsAction,
  deleteTimeLogAction,
} from "@/app/actions/time-tracking";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, Plus } from "lucide-react";
import { LogTimeDialog } from "./log-time-dialog";

interface TimeLogsListProps {
  issueId: string;
  issueKey: string;
  totalTimeSpent?: number | null;
}

export function TimeLogsList({
  issueId,
  issueKey,
  totalTimeSpent = 0,
}: TimeLogsListProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getTimeLogsAction(issueId);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    let ignore = false;
    getTimeLogsAction(issueId).then((data) => {
      if (!ignore) {
        setLogs(data);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [issueId]);

  const handleDelete = async (logId: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    try {
      await deleteTimeLogAction(logId, issueId);
      await fetchLogs();
    } catch (err: any) {
      alert(err.message || "Failed to delete log");
    }
  };

  const computedTotal =
    logs.reduce((sum, l) => sum + l.timeSpent, 0) || (totalTimeSpent ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-sm">Time Logged</span>
          <Badge variant="secondary" className="font-mono">
            {computedTotal.toFixed(1)}h total
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Log Time
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-2">
          Loading time logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-md">
          No time logged yet. Click &quot;Log Time&quot; to add hours.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between p-2.5 rounded-lg border bg-card/60 text-xs hover:bg-card transition-colors"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Avatar className="w-6 h-6 mt-0.5">
                  <AvatarImage src={log.user.image || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {log.user.name?.slice(0, 2).toUpperCase() || "US"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {log.user.name}
                    </span>
                    <Badge
                      variant={log.billable ? "outline" : "secondary"}
                      className="text-[10px] px-1 py-0 h-4"
                    >
                      {log.billable ? "Billable" : "Non-billable"}
                    </Badge>
                  </div>
                  {log.description && (
                    <p className="text-muted-foreground truncate max-w-xs">
                      {log.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(log.loggedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-semibold text-foreground font-mono">
                  {log.timeSpent}h
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-500"
                  onClick={() => handleDelete(log.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LogTimeDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        issueId={issueId}
        issueKey={issueKey}
        onLogged={fetchLogs}
      />
    </div>
  );
}
