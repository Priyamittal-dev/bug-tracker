"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateIssue,
  updateIssueStatus,
  deleteIssue,
  addComment,
  deleteComment,
  addRelationship,
  removeRelationship,
} from "@/app/actions/issues";
import {
  IssueTypeBadge,
  IssueSeverityBadge,
  IssueStatusBadge,
  IssuePriorityBadge,
} from "@/components/common/issue-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
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
  Tag,
  Paperclip,
  Link2,
  Plus,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
} from "lucide-react";
import { TimeLogsList } from "@/components/time-tracking/time-logs-list";
import { SlaBadge } from "@/components/sla/sla-badge";

type IssueDetailProps = {
  issue: any;
  users: Array<{
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  }>;
  currentUserId: string;
  currentUserRole: string;
  availableLabels?: Array<{ id: string; name: string; color: string }>;
};

export function IssueDetailView({
  issue,
  users,
  currentUserId,
  currentUserRole,
  availableLabels = [],
}: IssueDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState(issue.description || "");

  // Bug details edit states
  const [stepsToReproduce, setStepsToReproduce] = useState(
    issue.stepsToReproduce || "",
  );
  const [expectedResult, setExpectedResult] = useState(
    issue.expectedResult || "",
  );
  const [actualResult, setActualResult] = useState(issue.actualResult || "");
  const [logs, setLogs] = useState(issue.logs || "");
  const [stackTrace, setStackTrace] = useState(issue.stackTrace || "");
  const [isEditingBugDetails, setIsEditingBugDetails] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState("");

  // Add Relationship
  const [isAddingRel, setIsAddingRel] = useState(false);
  const [relTargetIssueId, setRelTargetIssueId] = useState("");
  const [relType, setRelType] = useState("RELATES_TO");

  // Add Label
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");

  // Attachment upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Tab for timeline vs comments
  const [bottomTab, setBottomTab] = useState<"comments" | "activity">(
    "comments",
  );

  async function handleQuickStatus(status: string) {
    startTransition(async () => {
      await updateIssueStatus(issue.id, status);
      router.refresh();
    });
  }

  async function handleFieldChange(field: string, value: any) {
    startTransition(async () => {
      await updateIssue(issue.id, { [field]: value });
      router.refresh();
    });
  }

  async function handleSaveTitle() {
    if (!title.trim()) return;
    startTransition(async () => {
      await updateIssue(issue.id, { title: title.trim() });
      setIsEditingTitle(false);
      router.refresh();
    });
  }

  async function handleSaveDescription() {
    startTransition(async () => {
      await updateIssue(issue.id, { description: description.trim() });
      setIsEditingDesc(false);
      router.refresh();
    });
  }

  async function handleSaveBugDetails() {
    startTransition(async () => {
      await updateIssue(issue.id, {
        stepsToReproduce: stepsToReproduce.trim() || null,
        expectedResult: expectedResult.trim() || null,
        actualResult: actualResult.trim() || null,
        logs: logs.trim() || null,
        stackTrace: stackTrace.trim() || null,
      });
      setIsEditingBugDetails(false);
      router.refresh();
    });
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    startTransition(async () => {
      await addComment(issue.id, commentText);
      setCommentText("");
      router.refresh();
    });
  }

  async function handleDeleteComment(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId);
      router.refresh();
    });
  }

  async function handleAddRelationship(e: React.FormEvent) {
    e.preventDefault();
    if (!relTargetIssueId.trim()) return;
    startTransition(async () => {
      try {
        await addRelationship(issue.id, relTargetIssueId.trim(), relType);
        setIsAddingRel(false);
        setRelTargetIssueId("");
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Failed to link issue");
      }
    });
  }

  async function handleRemoveRelationship(relId: string) {
    startTransition(async () => {
      await removeRelationship(relId);
      router.refresh();
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/issues/${issue.id}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to upload file");
      }

      router.refresh();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    startTransition(async () => {
      try {
        await fetch(
          `/api/v1/issues/${issue.id}/attachments?attachmentId=${attachmentId}`,
          {
            method: "DELETE",
          },
        );
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  async function handleDeleteIssue() {
    if (
      !confirm(
        `Are you sure you want to permanently delete issue ${issue.key}?`,
      )
    )
      return;
    startTransition(async () => {
      await deleteIssue(issue.id);
      router.push(`/projects/${issue.projectId}`);
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <div className="border-b px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 bg-card/70 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            render={<Link href={`/projects/${issue.projectId}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${issue.projectId}`}
              className="font-mono text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              {issue.project?.key}
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-xs font-black bg-primary text-primary-foreground px-2 py-0.5 rounded">
              {issue.key}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <select
            value={issue.status}
            onChange={(e) => handleQuickStatus(e.target.value)}
            disabled={isPending}
            className="h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold focus:ring-1 focus:ring-primary"
          >
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CODE_REVIEW">Code Review</option>
            <option value="QA">QA</option>
            <option value="DONE">Done</option>
          </select>

          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleDeleteIssue}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 pb-16">
        {/* Left Column: Details, Bug Fields, Attachments, Comments, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <IssueTypeBadge type={issue.type} />
              {issue.severity && (
                <IssueSeverityBadge severity={issue.severity} />
              )}
              <IssuePriorityBadge priority={issue.priority} />
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-bold"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSaveTitle}
                  disabled={isPending}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingTitle(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                title="Click to edit title"
              >
                {issue.title}
              </h1>
            )}
          </div>

          {/* Description Section */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Description
              </h2>
              {!isEditingDesc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsEditingDesc(true)}
                >
                  Edit
                </Button>
              )}
            </div>

            {isEditingDesc ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="text-xs"
                  placeholder="Add a detailed description (markdown supported)..."
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDescription}
                    disabled={isPending}
                  >
                    Save Description
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingDesc(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {issue.description || (
                  <span className="text-muted-foreground italic">
                    No description provided. Click Edit to add details.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Specialized Bug Details (if BUG) */}
          {issue.type === "BUG" && (
            <div className="bg-card border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Bug Reproduction & Diagnostics
                  </h2>
                </div>
                {!isEditingBugDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsEditingBugDetails(true)}
                  >
                    Edit Diagnostics
                  </Button>
                )}
              </div>

              {isEditingBugDetails ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">
                      Steps to Reproduce
                    </label>
                    <Textarea
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                      rows={3}
                      placeholder="1. Go to page... 2. Click button..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">
                        Expected Result
                      </label>
                      <Textarea
                        value={expectedResult}
                        onChange={(e) => setExpectedResult(e.target.value)}
                        rows={2}
                        placeholder="What was expected to happen"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Actual Result
                      </label>
                      <Textarea
                        value={actualResult}
                        onChange={(e) => setActualResult(e.target.value)}
                        rows={2}
                        placeholder="What actually occurred"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">
                      Error Logs
                    </label>
                    <Textarea
                      value={logs}
                      onChange={(e) => setLogs(e.target.value)}
                      rows={2}
                      className="font-mono text-[11px]"
                      placeholder="Paste terminal / browser console logs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">
                      Stack Trace
                    </label>
                    <Textarea
                      value={stackTrace}
                      onChange={(e) => setStackTrace(e.target.value)}
                      rows={3}
                      className="font-mono text-[11px]"
                      placeholder="Paste stack trace"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveBugDetails}
                      disabled={isPending}
                    >
                      Save Diagnostics
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingBugDetails(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {issue.stepsToReproduce && (
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px]">
                        Steps to Reproduce:
                      </span>
                      <p className="whitespace-pre-wrap mt-0.5">
                        {issue.stepsToReproduce}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {issue.expectedResult && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-lg">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 block text-[11px]">
                          Expected Result:
                        </span>
                        <p className="mt-0.5">{issue.expectedResult}</p>
                      </div>
                    )}
                    {issue.actualResult && (
                      <div className="bg-red-500/5 border border-red-500/20 p-2.5 rounded-lg">
                        <span className="font-semibold text-red-600 dark:text-red-400 block text-[11px]">
                          Actual Result:
                        </span>
                        <p className="mt-0.5">{issue.actualResult}</p>
                      </div>
                    )}
                  </div>

                  {issue.logs && (
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px]">
                        Logs:
                      </span>
                      <pre className="p-2.5 rounded bg-muted font-mono text-[10px] overflow-x-auto mt-0.5">
                        {issue.logs}
                      </pre>
                    </div>
                  )}

                  {issue.stackTrace && (
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px]">
                        Stack Trace:
                      </span>
                      <pre className="p-2.5 rounded bg-muted/80 text-red-400 font-mono text-[10px] overflow-x-auto mt-0.5">
                        {issue.stackTrace}
                      </pre>
                    </div>
                  )}

                  {!issue.stepsToReproduce &&
                    !issue.expectedResult &&
                    !issue.actualResult &&
                    !issue.logs && (
                      <p className="text-muted-foreground italic">
                        No diagnostic logs attached. Click Edit Diagnostics to
                        add reproduction steps.
                      </p>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Issue Relationships */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Linked Issues & Relationships
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setIsAddingRel(!isAddingRel)}
              >
                <Plus className="h-3 w-3" />
                Link Issue
              </Button>
            </div>

            {isAddingRel && (
              <form
                onSubmit={handleAddRelationship}
                className="bg-muted/40 p-3 rounded-lg border space-y-2 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={relType}
                    onChange={(e) => setRelType(e.target.value)}
                    className="h-8 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value="RELATES_TO">Relates to</option>
                    <option value="BLOCKS">Blocks</option>
                    <option value="BLOCKED_BY">Is blocked by</option>
                    <option value="PARENT_CHILD">Child of (Subtask)</option>
                    <option value="DUPLICATE">Duplicates</option>
                    <option value="DUPLICATED_BY">Is duplicated by</option>
                  </select>

                  <Input
                    value={relTargetIssueId}
                    onChange={(e) => setRelTargetIssueId(e.target.value)}
                    placeholder="Enter target Issue ID or Key..."
                    className="h-8 text-xs sm:col-span-2"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setIsAddingRel(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7"
                    disabled={isPending}
                  >
                    Add Relationship
                  </Button>
                </div>
              </form>
            )}

            {/* List existing relations */}
            <div className="space-y-1.5 text-xs">
              {issue.sourceRelations?.map((rel: any) => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-md border"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground text-[10px] uppercase">
                      {rel.type.replace("_", " ")}
                    </span>
                    <Link
                      href={`/issues/${rel.targetIssue.id}`}
                      className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {rel.targetIssue.key}
                    </Link>
                    <span className="truncate max-w-sm text-foreground">
                      {rel.targetIssue.title}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    onClick={() => handleRemoveRelationship(rel.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {issue.targetRelations?.map((rel: any) => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-md border"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground text-[10px] uppercase">
                      LINKED FROM
                    </span>
                    <Link
                      href={`/issues/${rel.sourceIssue.id}`}
                      className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {rel.sourceIssue.key}
                    </Link>
                    <span className="truncate max-w-sm text-foreground">
                      {rel.sourceIssue.title}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    onClick={() => handleRemoveRelationship(rel.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {(!issue.sourceRelations || issue.sourceRelations.length === 0) &&
                (!issue.targetRelations ||
                  issue.targetRelations.length === 0) && (
                  <p className="text-muted-foreground italic text-xs py-1">
                    No linked issues.
                  </p>
                )}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Attachments
                </h2>
              </div>

              <div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors border">
                    <Plus className="h-3 w-3" />
                    {isUploading ? "Uploading..." : "Upload File"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="p-2 text-xs bg-red-500/10 text-red-600 rounded border border-red-500/20">
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {issue.attachments?.map((att: any) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="truncate">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground hover:underline truncate block"
                      >
                        {att.fileName || att.filename || "Attachment"}
                      </a>
                      <span className="text-[10px] text-muted-foreground">
                        {((att.fileSize || att.size || 0) / 1024).toFixed(1)} KB
                        •{" "}
                        {att.createdAt
                          ? new Date(att.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    onClick={() => handleDeleteAttachment(att.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {(!issue.attachments || issue.attachments.length === 0) && (
                <div className="col-span-full py-4 text-center text-muted-foreground italic text-xs">
                  No attachments yet. Upload logs, screenshots or trace files
                  (max 10MB).
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tabs: Comments vs Activity Timeline */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="flex border-b bg-muted/30">
              <button
                onClick={() => setBottomTab("comments")}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  bottomTab === "comments"
                    ? "border-primary text-primary bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Comments ({issue.comments?.length || 0})
              </button>

              <button
                onClick={() => setBottomTab("activity")}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  bottomTab === "activity"
                    ? "border-primary text-primary bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                Activity Timeline ({issue.activities?.length || 0})
              </button>
            </div>

            <div className="p-5">
              {bottomTab === "comments" ? (
                <div className="space-y-4">
                  {/* Comments list */}
                  <div className="space-y-3">
                    {issue.comments?.map((c: any) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-lg bg-muted/20 border space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={c.author?.avatar || ""} />
                              <AvatarFallback className="text-[9px]">
                                {c.author?.name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground">
                              {c.author?.name}
                            </span>
                            <span
                              className="text-[10px] text-muted-foreground"
                              suppressHydrationWarning
                            >
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {(c.authorId === currentUserId ||
                            currentUserRole === "ORGANIZATION_OWNER" ||
                            currentUserRole === "ORGANIZATION_ADMIN") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteComment(c.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap text-foreground/90 pl-7">
                          {c.content}
                        </p>
                      </div>
                    ))}

                    {(!issue.comments || issue.comments.length === 0) && (
                      <p className="text-muted-foreground italic text-xs py-2">
                        No comments yet. Start the conversation.
                      </p>
                    )}
                  </div>

                  {/* Add Comment Box */}
                  <form
                    onSubmit={handleAddComment}
                    className="space-y-2 pt-2 border-t"
                  >
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="text-xs"
                      required
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={isPending || !commentText.trim()}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Post Comment
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Activity Timeline */
                <div className="space-y-3">
                  {issue.activities?.map((act: any) => (
                    <div
                      key={act.id}
                      className="flex items-start gap-3 text-xs"
                    >
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {act.user?.name || "System"}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {act.action}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {act.details && (
                          <p className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                            {act.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!issue.activities || issue.activities.length === 0) && (
                    <p className="text-muted-foreground italic text-xs py-2">
                      No activity recorded yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Properties Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Attributes
            </h3>

            {/* Assignee */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Assignee
              </label>
              <select
                value={issue.assigneeId || ""}
                onChange={(e) =>
                  handleFieldChange("assigneeId", e.target.value || null)
                }
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reporter */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Reporter
              </label>
              <div className="flex items-center gap-2 p-1.5 rounded bg-muted/40">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={issue.reporter?.avatar || ""} />
                  <AvatarFallback className="text-[9px]">
                    {issue.reporter?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {issue.reporter?.name || "Unknown"}
                </span>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Priority
              </label>
              <select
                value={issue.priority}
                onChange={(e) => handleFieldChange("priority", e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="LOWEST">Lowest</option>
              </select>
            </div>

            {/* Severity (if applicable) */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Severity
              </label>
              <select
                value={issue.severity || "MODERATE"}
                onChange={(e) => handleFieldChange("severity", e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="BLOCKER">Blocker</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MODERATE">Moderate</option>
                <option value="MINOR">Minor</option>
                <option value="TRIVIAL">Trivial</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Due Date
              </label>
              <input
                type="date"
                value={
                  issue.dueDate
                    ? new Date(issue.dueDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleFieldChange(
                    "dueDate",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>

            {/* Environment */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Environment
              </label>
              <Input
                value={issue.environment || ""}
                onChange={(e) =>
                  handleFieldChange("environment", e.target.value)
                }
                placeholder="Production, Staging..."
                className="h-8 text-xs"
              />
            </div>

            {/* Labels */}
            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-muted-foreground font-medium block">
                Labels
              </label>
              <div className="flex flex-wrap gap-1">
                {issue.labels?.map((il: any) => {
                  const lbl = il.label || il;
                  return (
                    <span
                      key={lbl.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${lbl.color || "#6b7280"}22`,
                        color: lbl.color || "#6b7280",
                        border: `1px solid ${lbl.color || "#6b7280"}44`,
                      }}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {lbl.name}
                    </span>
                  );
                })}
                {(!issue.labels || issue.labels.length === 0) && (
                  <span className="text-muted-foreground italic text-[11px]">
                    No labels assigned
                  </span>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-1 pt-2 border-t text-[11px] text-muted-foreground">
              <div>Created: {new Date(issue.createdAt).toLocaleString()}</div>
              <div>Updated: {new Date(issue.updatedAt).toLocaleString()}</div>
            </div>
          </div>

          {/* SLA Tracking (if active) */}
          {issue.issueSla && (
            <div className="bg-card border rounded-xl p-5 space-y-3 text-xs">
              <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                SLA Compliance
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">First Response:</span>
                  <SlaBadge
                    status={issue.issueSla.responseStatus}
                    dueAt={issue.issueSla.responseDueAt}
                    type="response"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Resolution:</span>
                  <SlaBadge
                    status={issue.issueSla.resolutionStatus}
                    dueAt={issue.issueSla.resolutionDueAt}
                    type="resolution"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Release Version (if linked) */}
          {issue.release && (
            <div className="bg-card border rounded-xl p-5 space-y-2 text-xs">
              <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Target Release
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  <span className="font-mono font-bold text-foreground">
                    {issue.release.version}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground">{issue.release.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {issue.release.status}
                </Badge>
              </div>
            </div>
          )}

          {/* Work Time Tracking */}
          <div className="bg-card border rounded-xl p-5">
            <TimeLogsList
              issueId={issue.id}
              issueKey={issue.key}
              totalTimeSpent={issue.timeSpent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
