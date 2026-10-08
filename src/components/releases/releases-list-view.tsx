"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getReleasesAction,
  updateReleaseAction,
  deleteReleaseAction,
} from "@/app/actions/releases";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tag,
  Plus,
  CheckCircle2,
  Calendar,
  Archive,
  Trash2,
  Rocket,
} from "lucide-react";
import { CreateReleaseDialog } from "./create-release-dialog";

interface ReleasesListViewProps {
  projectId: string;
  projectName: string;
}

export function ReleasesListView({
  projectId,
  projectName,
}: ReleasesListViewProps) {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchReleases = useCallback(async () => {
    try {
      const data = await getReleasesAction(projectId);
      setReleases(data);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let ignore = false;
    getReleasesAction(projectId).then((data) => {
      if (!ignore) {
        setReleases(data);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [projectId]);

  const handlePublish = async (releaseId: string) => {
    if (!confirm("Are you sure you want to mark this release as RELEASED?"))
      return;
    try {
      await updateReleaseAction(releaseId, projectId, { status: "RELEASED" });
      await fetchReleases();
    } catch (err: any) {
      alert(err.message || "Failed to publish release");
    }
  };

  const handleDelete = async (releaseId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this release? (Issues will remain)",
      )
    )
      return;
    try {
      await deleteReleaseAction(releaseId, projectId);
      await fetchReleases();
    } catch (err: any) {
      alert(err.message || "Failed to delete release");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-500" />
            Releases & Versions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product versions, milestone releases, and track completion
            for {projectName}.
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Release
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Loading releases...
        </div>
      ) : releases.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed rounded-xl bg-card/40">
          <Tag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-lg text-foreground">
            No releases yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Track your deployments and group resolved issues into production
            release versions.
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Create First Release
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {releases.map((release) => {
            const isReleased = release.status === "RELEASED";
            return (
              <div
                key={release.id}
                className="p-5 rounded-xl border bg-card/70 hover:bg-card transition-all shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-bold text-foreground font-mono">
                        {release.version}
                      </span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="font-semibold text-foreground text-sm">
                        {release.name}
                      </span>
                      <Badge
                        variant={isReleased ? "default" : "outline"}
                        className={
                          isReleased
                            ? "bg-emerald-600 text-white text-xs"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs"
                        }
                      >
                        {release.status}
                      </Badge>
                    </div>
                    {release.description && (
                      <p className="text-xs text-muted-foreground">
                        {release.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {release.releaseDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(release.releaseDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {!isReleased && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => handlePublish(release.id)}
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        Publish
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => handleDelete(release.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {release.completedIssues} of {release.totalIssues} issues
                      completed
                    </span>
                    <span className="font-semibold">
                      {release.progressPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isReleased ? "bg-emerald-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${release.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateReleaseDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        projectId={projectId}
        onCreated={fetchReleases}
      />
    </div>
  );
}
