import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { authService } from "@/services/auth.service";
import { organizationService } from "@/services/organization.service";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";
import { prisma } from "@/lib/prisma";

describe("E2E: Complete Project Management & Issue Tracking Lifecycle (Phase 2)", () => {
  const timestamp = Date.now();
  let leadUser: any;
  let devUser: any;
  let org: any;
  let project: any;
  let createdIssue: any;
  let label: any;

  beforeAll(async () => {
    // 1. Register Lead User
    leadUser = await authService.register({
      name: "Engineering Lead",
      email: `eng-lead-${timestamp}@enterprise.io`,
      password: "Password123!",
      organizationName: "Nova Dynamics",
    });
    expect(leadUser).toBeDefined();

    // 2. Register Dev User
    devUser = await authService.register({
      name: "Frontend Developer",
      email: `fe-dev-${timestamp}@enterprise.io`,
      password: "Password123!",
      organizationName: "Solo Workspace",
    });

    // Get leadUser's org
    const membership = await prisma.membership.findFirst({
      where: { userId: leadUser.user.id },
      include: { organization: true },
    });
    org = membership?.organization;
    expect(org).toBeDefined();

    // Add devUser to leadUser's org
    await organizationService.addMember(org.id, leadUser.user.id, {
      userId: devUser.user.id,
      role: "DEVELOPER",
    });
  });

  afterAll(async () => {
    if (org?.id)
      await prisma.organization.deleteMany({ where: { id: org.id } });
    if (leadUser?.user?.id)
      await prisma.user.deleteMany({ where: { id: leadUser.user.id } });
    if (devUser?.user?.id)
      await prisma.user.deleteMany({ where: { id: devUser.user.id } });
  });

  it("Step 1: Create a Multi-Tenant Project", async () => {
    project = await projectService.createProject(org.id, leadUser.user.id, {
      name: "Cloud Console",
      key: "CONSOLE",
      description: "Next-gen web cloud management interface",
      category: "Infrastructure",
      projectType: "SOFTWARE",
    });

    expect(project).toBeDefined();
    expect(project.key).toBe("CONSOLE");
    expect(project.organizationId).toBe(org.id);
  });

  it("Step 2: Add Developer to Project with DEVELOPER role", async () => {
    const member = await projectService.addMember(
      project.id,
      org.id,
      leadUser.user.id,
      {
        userId: devUser.user.id,
        role: "DEVELOPER",
      },
    );

    expect(member.role).toBe("DEVELOPER");
    expect(member.userId).toBe(devUser.user.id);
  });

  it("Step 3: Create an Issue in Project", async () => {
    createdIssue = await issueService.createIssue(
      project.id,
      org.id,
      leadUser.user.id,
      {
        title: "Add dark mode toggle to navigation header",
        description:
          "Persist preference in localStorage and synchronize with system color scheme",
        type: "FEATURE",
        priority: "HIGH",
        status: "BACKLOG",
      },
    );

    expect(createdIssue).toBeDefined();
    expect(createdIssue.key).toBe("CONSOLE-1");
    expect(createdIssue.status).toBe("BACKLOG");
  });

  it("Step 4: Assign Issue to Developer", async () => {
    const updated = await issueService.updateIssue(
      createdIssue.id,
      org.id,
      leadUser.user.id,
      {
        assigneeId: devUser.user.id,
      },
    );

    expect(updated.assigneeId).toBe(devUser.user.id);
  });

  it("Step 5: Change Status from BACKLOG to IN_PROGRESS", async () => {
    const updated = await issueService.updateIssue(
      createdIssue.id,
      org.id,
      devUser.user.id,
      {
        status: "IN_PROGRESS",
      },
    );

    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("Step 6: Add Comment on Issue", async () => {
    const comment = await issueService.addComment(
      createdIssue.id,
      org.id,
      devUser.user.id,
      "Started working on the CSS variables and theme switch provider.",
    );

    expect(comment).toBeDefined();
    expect(comment.content).toContain("CSS variables");
    expect(comment.authorId).toBe(devUser.user.id);
  });

  it("Step 7: Create and Assign Label to Issue", async () => {
    label = await issueService.createLabel(
      org.id,
      leadUser.user.id,
      {
        name: "UI/UX",
        color: "#8b5cf6",
        description: "User interface enhancements",
      },
      project.id,
    );

    expect(label).toBeDefined();

    const assigned = await issueService.assignLabel(
      createdIssue.id,
      label.id,
      org.id,
      devUser.user.id,
    );
    expect(assigned).toBeDefined();
  });

  it("Step 8: Move Issue on Kanban Board (Advance to CODE_REVIEW then DONE)", async () => {
    // Move to CODE_REVIEW
    const inReview = await issueService.updateIssue(
      createdIssue.id,
      org.id,
      devUser.user.id,
      {
        status: "CODE_REVIEW",
      },
    );
    expect(inReview.status).toBe("CODE_REVIEW");

    // Move to DONE
    const done = await issueService.updateIssue(
      createdIssue.id,
      org.id,
      leadUser.user.id,
      {
        status: "DONE",
      },
    );
    expect(done.status).toBe("DONE");
  });

  it("Step 9: Verify Complete Issue Details with Timeline & Labels", async () => {
    const details = await issueService.getIssueById(
      createdIssue.id,
      org.id,
      leadUser.user.id,
    );

    expect(details).toBeDefined();
    expect(details.key).toBe("CONSOLE-1");
    expect(details.status).toBe("DONE");
    expect(details.assignee?.id).toBe(devUser.user.id);
    expect(details.labels.length).toBe(1);
    expect(details.labels[0].label.name).toBe("UI/UX");
    expect(details.comments.length).toBe(1);
    expect(details.activities.length).toBeGreaterThanOrEqual(4); // status, assignee, etc.
  });
});
