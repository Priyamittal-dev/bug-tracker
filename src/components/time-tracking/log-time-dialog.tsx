"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logTimeAction } from "@/app/actions/time-tracking";
import { Clock, Loader2 } from "lucide-react";

interface LogTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  issueKey: string;
  onLogged?: () => void;
}

export function LogTimeDialog({
  isOpen,
  onClose,
  issueId,
  issueKey,
  onLogged,
}: LogTimeDialogProps) {
  const [timeSpent, setTimeSpent] = useState("1.0");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const hours = parseFloat(timeSpent);
    if (isNaN(hours) || hours <= 0) {
      setError("Please enter a valid number of hours");
      return;
    }

    setIsSubmitting(true);
    try {
      await logTimeAction(issueId, {
        timeSpent: hours,
        description: description.trim() || undefined,
        billable,
      });
      onClose();
      onLogged?.();
    } catch (err: any) {
      setError(err.message || "Failed to log time");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            Log Work: {issueKey}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="timeSpent">Time Spent (Hours) *</Label>
            <Input
              id="timeSpent"
              type="number"
              step="0.25"
              min="0.1"
              max="24"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g. 2.5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Work Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on? (e.g. Debugged token expiration issue)"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="billable"
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <Label htmlFor="billable" className="cursor-pointer font-normal">
              Billable hours
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Time Log
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
