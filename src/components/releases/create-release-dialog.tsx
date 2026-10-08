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
import { createReleaseAction } from "@/app/actions/releases";
import { Tag, Loader2 } from "lucide-react";

interface CreateReleaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCreated?: () => void;
}

export function CreateReleaseDialog({
  isOpen,
  onClose,
  projectId,
  onCreated,
}: CreateReleaseDialogProps) {
  const [version, setVersion] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createReleaseAction(projectId, {
        version: version.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        releaseDate: releaseDate
          ? new Date(releaseDate).toISOString()
          : undefined,
        releaseNotes: releaseNotes.trim() || undefined,
      });
      onClose();
      onCreated?.();
    } catch (err: any) {
      setError(err.message || "Failed to create release");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-500" />
            Create Version / Release
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version Tag *</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v1.2.0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="releaseDate">Target Date</Label>
              <Input
                id="releaseDate"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Release Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Q3 Feature Pack"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what's in this release"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="releaseNotes">Release Notes (Markdown)</Label>
            <Textarea
              id="releaseNotes"
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="### What's New&#10;- Feature 1&#10;- Performance improvements"
              rows={3}
            />
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
              Create Release
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
