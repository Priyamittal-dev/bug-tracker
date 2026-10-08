"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeSprint } from "@/app/actions/sprints";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function CompleteSprintDialog({
  sprint,
  completedIssuesCount,
  incompleteIssuesCount,
  completedPoints,
  incompletePoints,
  otherSprints = [],
}: {
  sprint: { id: string; name: string };
  completedIssuesCount: number;
  incompleteIssuesCount: number;
  completedPoints: number;
  incompletePoints: number;
  otherSprints?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [destination, setDestination] = useState<"BACKLOG" | "SPRINT">(
    "BACKLOG",
  );
  const [targetSprintId, setTargetSprintId] = useState<string>(
    otherSprints[0]?.id || "",
  );

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await completeSprint(sprint.id, {
        moveIncompleteTo: destination,
        targetSprintId: destination === "SPRINT" ? targetSprintId : undefined,
      });

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to complete sprint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs border-primary/30 hover:border-primary text-foreground font-semibold"
          >
            <Check className="h-3.5 w-3.5 text-primary" />
            Complete Sprint
          </Button>
        }
      />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Complete {sprint.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleComplete} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-start gap-2 text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sprint outcome stats */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
                Completed
              </span>
              <div className="text-base font-black text-foreground">
                {completedIssuesCount} issues
              </div>
              <div className="font-mono text-muted-foreground mt-0.5">
                {completedPoints} points delivered
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
              <span className="text-amber-700 dark:text-amber-300 font-bold block mb-1">
                Incomplete
              </span>
              <div className="text-base font-black text-foreground">
                {incompleteIssuesCount} issues
              </div>
              <div className="font-mono text-muted-foreground mt-0.5">
                {incompletePoints} points remaining
              </div>
            </div>
          </div>

          {/* Incomplete issues migration choice */}
          {incompleteIssuesCount > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-bold text-foreground">
                Move open issues to:
              </Label>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs p-2 rounded-md border bg-muted/30 cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="destination"
                    checked={destination === "BACKLOG"}
                    onChange={() => setDestination("BACKLOG")}
                    className="accent-primary"
                  />
                  <span>Product Backlog (default)</span>
                </label>

                {otherSprints.length > 0 && (
                  <label className="flex items-center gap-2 text-xs p-2 rounded-md border bg-muted/30 cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === "SPRINT"}
                      onChange={() => setDestination("SPRINT")}
                      className="accent-primary"
                    />
                    <span>Next Sprint</span>
                    <select
                      value={targetSprintId}
                      onChange={(e) => setTargetSprintId(e.target.value)}
                      disabled={destination !== "SPRINT"}
                      className="ml-auto bg-background border rounded px-2 py-1 text-xs"
                    >
                      {otherSprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Complete & Close
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
