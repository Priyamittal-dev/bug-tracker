"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateIssue,
  updateIssueStatus,
  deleteIssue,
  addComment,
} from "@/app/actions/issues";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IssueTypeBadge,
  IssueSeverityBadge,
  IssueStatusBadge,
  IssuePriorityBadge,
} from "@/components/common/issue-badges";
import { formatDistanceToNow } from "date-fns";
import {
  Trash2,
  MessageSquare,
  Send,
  Calendar,
  Clock,
  Layers,
  Monitor,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Loader2,
  X,
} from "lucide-react";

type IssueWithDetails = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  severity: string;
  module: string;
  reproducibility: string;
  environment: string;
  dueDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  projectId: string;
  assignee?: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  } | null;
  reporter?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  milestone?: {
    id: string;
    name: string;
  } | null;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: Date | string;
    author: {
      name: string;
      avatar: string | null;
      role?: string;
      jobTitle?: string;
    };
  }>;
};

export function IssueDetailDialog({
  issue,
  open,
  onOpenChange,
  users = [],
}: {
  issue: IssueWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users?: Array<{
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState(issue?.description || "");
  const [comments, setComments] = useState<any[]>(issue?.comments || []);

  useEffect(() => {
    if (issue) {
      setComments(issue.comments || []);
      setDescription(issue.description || "");
    }
  }, [issue]);

  if (!issue) return null;

  async function handleStatusChange(newStatus: string) {
    if (!issue) return;
    startTransition(async () => {
      await updateIssueStatus(issue.id, newStatus);
      router.refresh();
    });
  }

  async function handleFieldChange(field: string, value: string) {
    if (!issue) return;
    startTransition(async () => {
      await updateIssue(issue.id, { [field]: value });
      router.refresh();
    });
  }

  async function handleSaveDescription() {
    if (!issue) return;
    startTransition(async () => {
      await updateIssue(issue.id, { description: description.trim() });
      setIsEditingDesc(false);
      router.refresh();
    });
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !issue) return;
    startTransition(async () => {
      try {
        const newComment = await addComment(issue.id, text);
        if (newComment) {
          setComments((prev) => [...prev, newComment]);
        }
        setCommentText("");
        router.refresh();
      } catch (err: any) {
        console.error("Failed to post comment:", err);
      }
    });
  }

  async function handleDelete() {
    if (!issue || !confirm("Are you sure you want to delete this defect?"))
      return;
    startTransition(async () => {
      await deleteIssue(issue.id);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl border border-border/60">
        {/* Header with key, type, status bar */}
        <div className="border-b border-border/60 px-4 sm:px-6 py-3.5 bg-muted/30 flex items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-mono text-xs sm:text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {issue.key}
            </span>
            <IssueTypeBadge type={issue.type} />
            <IssueSeverityBadge severity={issue.severity} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 h-8 gap-1.5 font-semibold"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 sm:p-6">
          {/* Main Left Column (Title, Description, Comments) */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold leading-tight tracking-tight text-foreground">
                {issue.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                <span>
                  Created{" "}
                  {formatDistanceToNow(new Date(issue.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                {issue.reporter && (
                  <span>
                    Reported by{" "}
                    <strong className="text-foreground">
                      {issue.reporter.name}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  Description & Reproduction
                </Label>
                {!isEditingDesc && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 text-xs font-semibold"
                    onClick={() => setIsEditingDesc(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>

              {isEditingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-mono p-3 bg-background border-input rounded-lg"
                    placeholder="Provide detailed defect description and steps to reproduce..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setIsEditingDesc(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      onClick={handleSaveDescription}
                      disabled={isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
                  {issue.description || (
                    <span className="italic text-muted-foreground">
                      No description provided for this defect.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Discussion & Activity Stream */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Comments & Collaboration ({comments.length})
              </h3>

              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={comment.author?.avatar || ""} />
                          <AvatarFallback className="text-[9px]">
                            {(comment.author?.name || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-foreground">
                          {comment.author?.name || "Team Member"}
                        </span>
                        {(comment.author?.jobTitle || comment.author?.role) && (
                          <span className="text-[10px] text-muted-foreground">
                            ({comment.author?.jobTitle || comment.author?.role})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {comment.createdAt
                          ? formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                            })
                          : "just now"}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap leading-normal pl-7">
                      {comment.content}
                    </p>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No comments yet. Be the first to leave a note.
                  </p>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment or status update..."
                  className="text-xs h-9 bg-background flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !commentText.trim()}
                  className="gap-1.5 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post
                </Button>
              </form>
            </div>
          </div>

          {/* Sidebar Right Column (Metadata Fields) */}
          <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
              Defect Metadata
            </h3>

            {/* Status Field */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Status
              </Label>
              <select
                value={issue.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isPending}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Severity Field */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Severity
              </Label>
              <select
                value={issue.severity}
                onChange={(e) => handleFieldChange("severity", e.target.value)}
                disabled={isPending}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="CRITICAL">Critical (Crash)</option>
                <option value="MAJOR">Major</option>
                <option value="MODERATE">Moderate</option>
                <option value="MINOR">Minor</option>
              </select>
            </div>

            {/* Priority Field */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Priority
              </Label>
              <select
                value={issue.priority}
                onChange={(e) => handleFieldChange("priority", e.target.value)}
                disabled={isPending}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Assignee Field */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Assignee
              </Label>
              <select
                value={issue.assignee?.id || ""}
                onChange={(e) =>
                  handleFieldChange("assigneeId", e.target.value)
                }
                disabled={isPending}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Environment & Reproducibility */}
            <div className="pt-2 border-t border-border/50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment:</span>
                <span className="font-semibold text-foreground">
                  {issue.environment || "Production"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reproducibility:</span>
                <span className="font-semibold text-foreground">
                  {issue.reproducibility || "Always"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Module:</span>
                <span className="font-semibold text-foreground">
                  {issue.module || "General"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
