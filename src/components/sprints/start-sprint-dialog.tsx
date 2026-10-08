"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startSprint } from "@/app/actions/sprints";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Timer, Loader2, AlertCircle } from "lucide-react";

export function StartSprintDialog({
  sprint,
  issueCount,
  totalPoints,
}: {
  sprint: { id: string; name: string; startDate?: any; endDate?: any };
  issueCount: number;
  totalPoints: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() =>
    sprint.startDate
      ? new Date(sprint.startDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(() => {
    if (sprint.endDate)
      return new Date(sprint.endDate).toISOString().split("T")[0];
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await startSprint(sprint.id, {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to start sprint");
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
            variant="default"
            className="gap-1.5 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Play className="h-3 w-3 fill-white" />
            Start Sprint
          </Button>
        }
      />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-emerald-600" />
            Start Sprint: {sprint.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleStart} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-start gap-2 text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-muted/40 p-3 rounded-lg border text-xs flex justify-between items-center">
            <div>
              <span className="text-muted-foreground block">
                Issues committed:
              </span>
              <span className="font-bold text-foreground text-sm">
                {issueCount} issues
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-right">
                Story points:
              </span>
              <span className="font-bold text-foreground text-sm font-mono text-right block">
                {totalPoints} pts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs font-semibold">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs font-semibold">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

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
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Begin Sprint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
