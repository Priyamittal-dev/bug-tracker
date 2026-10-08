import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";
import { organizationService } from "@/services/organization.service";
import { prisma } from "@/lib/prisma";

describe("Integration: Issue Service & Bug Tracking Lifecycle (Phase 2)", () => {
  const timestamp = Date.now();
  let user1: any;
  let user2: any;
  let org: any;
  let project: any;
  let issue1: any;
  let issue2: any;
  let bugIssue: any;
  let label1: any;

  beforeAll(async () => {
    user1 = await prisma.user.create({
      data: {
        name: "Alice Engineer",
        email: `alice-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });

    user2 = await prisma.user.create({
      data: {
        name: "Bob QA",
        email: `bob-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });

    org = await organizationService.createOrganization(user1.id, {
      name: "Cyberdyne Systems",
      slug: `cyberdyne-${timestamp}`,
    });

    await organizationService.addMember(org.id, user1.id, {
      userId: user2.id,
      role: "DEVELOPER",
    });

    project = await projectService.createProject(org.id, user1.id, {
      name: "Payment Gateway",
      key: "PAY",
    });

    await projectService.addMember(project.id, org.id, user1.id, {
      userId: user2.id,
      role: "DEVELOPER",
    });
  });

  afterAll(async () => {
    if (org?.id)
      await prisma.organization.deleteMany({ where: { id: org.id } });
    if (user1?.id) await prisma.user.deleteMany({ where: { id: user1.id } });
    if (user2?.id) await prisma.user.deleteMany({ where: { id: user2.id } });
  });

  it("should create issues with atomic incrementing keys (e.g. PAY-1, PAY-2)", async () => {
    issue1 = await issueService.createIssue(project.id, org.id, user1.id, {
      title: "Set up Stripe webhook handler",
      type: "TASK",
      priority: "HIGH",
      status: "TODO",
    });

    expect(issue1).toBeDefined();
    expect(issue1.key).toBe("PAY-1");
    expect(issue1.number).toBe(1);

    issue2 = await issueService.createIssue(project.id, org.id, user1.id, {
      title: "Add refund processing API",
      type: "STORY",
      priority: "MEDIUM",
      status: "TODO",
    });

    expect(issue2.key).toBe("PAY-2");
    expect(issue2.number).toBe(2);
  });

  it("should create a specialized BUG with rich diagnostic fields", async () => {
    bugIssue = await issueService.createIssue(project.id, org.id, user2.id, {
      title: "Double charge occurs on rapid button click",
      type: "BUG",
      priority: "CRITICAL",
      severity: "BLOCKER",
      status: "TODO",
      environment: "Production",
      operatingSystem: "macOS Sonoma 14.5",
      browser: "Chrome 129",
      device: "MacBook Pro M2",
      appVersion: "v1.2.0",
      stepsToReproduce:
        "1. Go to checkout\n2. Rapidly double click Submit Payment button",
      expectedResult:
        "Button should be disabled on first click and only 1 charge created",
      actualResult:
        "Two identical Stripe charge intents created simultaneously",
      logs: "POST /api/v1/charge 200 OK (x2 in 12ms)",
      stackTrace: "StripeDuplicateChargeException: Idempotency key omitted",
    });

    expect(bugIssue).toBeDefined();
    expect(bugIssue.key).toBe("PAY-3");
    expect(bugIssue.severity).toBe("BLOCKER");
    expect(bugIssue.stepsToReproduce).toContain("Rapidly double click");
    expect(bugIssue.browser).toBe("Chrome 129");
  });

  it("should update issue status, priority, and assignee and log activities", async () => {
    const updated = await issueService.updateIssue(
      bugIssue.id,
      org.id,
      user1.id,
      {
        status: "IN_PROGRESS",
        priority: "CRITICAL",
        assigneeId: user1.id,
      },
    );

    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.assigneeId).toBe(user1.id);

    // Check activity timeline
    const activities = await issueService.listActivities(
      bugIssue.id,
      org.id,
      user1.id,
    );
    expect(activities.length).toBeGreaterThanOrEqual(1);
    const statusAct = activities.find(
      (a: any) => a.action === "STATUS_CHANGED",
    );
    expect(statusAct).toBeDefined();
    expect(statusAct?.newValue).toBe("IN_PROGRESS");
  });

  it("should create project labels and assign them to an issue", async () => {
    label1 = await issueService.createLabel(
      org.id,
      user1.id,
      {
        name: "Security",
        color: "#ef4444",
        description: "Security and compliance critical defects",
      },
      project.id,
    );

    expect(label1).toBeDefined();
    expect(label1.name).toBe("Security");

    // Assign label to bug issue
    const assigned = await issueService.assignLabel(
      bugIssue.id,
      label1.id,
      org.id,
      user1.id,
    );
    expect(assigned).toBeDefined();

    // Fetch issue details and check label
    const issueDetails = await issueService.getIssueById(
      bugIssue.id,
      org.id,
      user1.id,
    );
    expect(issueDetails.labels.length).toBe(1);
    expect(issueDetails.labels[0].label.name).toBe("Security");
  });

  it("should add, retrieve, and delete comments", async () => {
    const comment = await issueService.addComment(
      bugIssue.id,
      org.id,
      user2.id,
      "I investigated this: we need to generate an idempotency key before submitting.",
    );

    expect(comment).toBeDefined();
    expect(comment.content).toContain("idempotency key");
    expect(comment.authorId).toBe(user2.id);

    // Delete comment
    const deleteRes = await issueService.deleteComment(
      comment.id,
      org.id,
      user2.id,
    );
    expect(deleteRes.success).toBe(true);
  });

  it("should create issue relationships and reject invalid self-references", async () => {
    // Cannot link issue to itself
    await expect(
      issueService.createRelationship(
        bugIssue.id,
        bugIssue.id,
        "BLOCKS",
        org.id,
        user1.id,
      ),
    ).rejects.toThrow(/relationship with itself/i);

    // Link: bugIssue blocks issue1
    const rel = await issueService.createRelationship(
      bugIssue.id,
      issue1.id,
      "BLOCKS",
      org.id,
      user1.id,
    );
    expect(rel).toBeDefined();
    expect(rel.type).toBe("BLOCKS");
    expect(rel.sourceIssueId).toBe(bugIssue.id);
    expect(rel.targetIssueId).toBe(issue1.id);

    // Cannot create duplicate identical relationship
    await expect(
      issueService.createRelationship(
        bugIssue.id,
        issue1.id,
        "BLOCKS",
        org.id,
        user1.id,
      ),
    ).rejects.toThrow(/already exists/);

    // Delete relationship
    const deleteRel = await issueService.deleteRelationship(rel.id, org.id);
    expect(deleteRel.success).toBe(true);
  });

  it("should record attachments and delete attachments cleanly", async () => {
    const attachment = await issueService.createAttachment(
      bugIssue.id,
      org.id,
      user1.id,
      "crash-dump.log",
      1024 * 50,
      "text/plain",
      "/uploads/crash-dump.log",
    );

    expect(attachment).toBeDefined();
    expect(attachment.fileName).toContain("crash-dump");
    expect(attachment.fileName.endsWith(".log")).toBe(true);
    expect(attachment.fileSize).toBe(51200);

    // Test addAttachment with buffer (mimicking multipart form-data upload from UI)
    const uploadedAttachment = await issueService.addAttachment(
      bugIssue.id,
      org.id,
      user1.id,
      {
        name: "test_screenshot.png",
        size: 2048,
        type: "image/png",
        buffer: Buffer.from("fake-image-bytes"),
      },
    );
    expect(uploadedAttachment).toBeDefined();
    expect(uploadedAttachment.fileName).toContain("test_screenshot");
    expect(uploadedAttachment.mimeType).toBe("image/png");
    expect(uploadedAttachment.fileSize).toBe(2048);

    const del = await issueService.deleteAttachment(
      attachment.id,
      org.id,
      user1.id,
    );
    expect(del.success).toBe(true);
    const del2 = await issueService.deleteAttachment(
      uploadedAttachment.id,
      org.id,
      user1.id,
    );
    expect(del2.success).toBe(true);
  });

  it("should search issues by query filter syntax (project:KEY, status:..., priority:...)", async () => {
    const results = await issueService.listIssues(org.id, {
      search: `project:PAY status:in_progress`,
    });

    expect(results.issues.length).toBeGreaterThanOrEqual(1);
    expect(results.issues[0].status).toBe("IN_PROGRESS");
  });
});
