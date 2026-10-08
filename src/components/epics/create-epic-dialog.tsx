"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEpic } from "@/app/actions/epics";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Milestone, Loader2 } from "lucide-react";

export function CreateEpicDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<
    "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  >("HIGH");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createEpic(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      });

      setOpen(false);
      setTitle("");
      setDescription("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create epic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5 shadow-xs font-semibold">
            <Plus className="h-4 w-4" />
            Create Epic
          </Button>
        }
      />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Milestone className="h-5 w-5 text-purple-500" />
            Create Strategic Epic
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="epic-title" className="text-xs font-semibold">
              Epic Title *
            </Label>
            <Input
              id="epic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Identity & Access Management 2.0"
              required
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="epic-description" className="text-xs font-semibold">
              Description & Objectives
            </Label>
            <Textarea
              id="epic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Strategic scope and definition of done for this Epic..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="epic-priority" className="text-xs font-semibold">
              Priority
            </Label>
            <select
              id="epic-priority"
              value={priority}
              onChange={(e: any) => setPriority(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-xs"
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="epic-start" className="text-xs font-semibold">
                Start Date
              </Label>
              <Input
                id="epic-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="epic-target" className="text-xs font-semibold">
                Target Date
              </Label>
              <Input
                id="epic-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
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
              disabled={loading || !title.trim()}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Create Epic
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
