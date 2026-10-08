import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { sprintService } from "@/services/sprint.service";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";

describe("Phase 3 SprintService Integration Tests", () => {
  let org: any;
  let user: any;
  let project: any;

  beforeEach(async () => {
    // Unique test run entities
    const suffix = Math.random().toString(36).substring(7);
    user = await prisma.user.create({
      data: {
        name: `Scrum Master ${suffix}`,
        email: `scrum-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });

    org = await prisma.organization.create({
      data: {
        name: `Agile Org ${suffix}`,
        slug: `agile-org-${suffix}`,
        status: "ACTIVE",
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "ORGANIZATION_OWNER",
        status: "ACTIVE",
      },
    });

    project = await projectService.createProject(org.id, user.id, {
      name: "Scrum Core Engine",
      key: `SCRUM${suffix.toUpperCase().slice(0, 3)}`,
      category: "Software Development",
    });
  });

  it("creates a sprint in PLANNING status", async () => {
    const sprint = await sprintService.createSprint(
      project.id,
      org.id,
      user.id,
      {
        name: "Sprint 1",
        goal: "Build Sprint Backlog",
      },
    );

    expect(sprint.id).toBeDefined();
    expect(sprint.name).toBe("Sprint 1");
    expect(sprint.status).toBe("PLANNING");
    expect(sprint.projectId).toBe(project.id);
  });

  it("starts a sprint and prevents concurrent active sprints on same project", async () => {
    const sprint1 = await sprintService.createSprint(
      project.id,
      org.id,
      user.id,
      { name: "Sprint Alpha" },
    );

    const sprint2 = await sprintService.createSprint(
      project.id,
      org.id,
      user.id,
      { name: "Sprint Beta" },
    );

    const started1 = await sprintService.startSprint(
      sprint1.id,
      org.id,
      user.id,
      { endDate: new Date(Date.now() + 14 * 86400000).toISOString() },
    );

    expect(started1.status).toBe("ACTIVE");

    // Starting sprint2 while sprint1 is active should fail with ACTIVE_SPRINT_EXISTS
    await expect(
      sprintService.startSprint(sprint2.id, org.id, user.id, {
        endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      }),
    ).rejects.toThrow(/already ACTIVE/);
  });

  it("adds issues to sprint and computes total story points", async () => {
    const sprint = await sprintService.createSprint(
      project.id,
      org.id,
      user.id,
      { name: "Sprint Points Test" },
    );

    const issue1 = await issueService.createIssue(project.id, org.id, user.id, {
      title: "Story A",
      storyPoints: 5,
    });
    const issue2 = await issueService.createIssue(project.id, org.id, user.id, {
      title: "Story B",
      storyPoints: 8,
    });

    await sprintService.addIssuesToSprint(sprint.id, org.id, user.id, [
      issue1.id,
      issue2.id,
    ]);

    const fetched = await sprintService.getSprint(sprint.id, org.id, user.id);
    expect(fetched.issues.length).toBe(2);
    expect(fetched.calculatedTotalPoints).toBe(13);
  });

  it("completes sprint and carries over incomplete issues to backlog", async () => {
    const sprint = await sprintService.createSprint(
      project.id,
      org.id,
      user.id,
      { name: "Sprint Completion" },
    );

    const issueDone = await issueService.createIssue(
      project.id,
      org.id,
      user.id,
      { title: "Done Story", storyPoints: 5, status: "DONE" },
    );
    const issuePending = await issueService.createIssue(
      project.id,
      org.id,
      user.id,
      { title: "Pending Story", storyPoints: 3, status: "IN_PROGRESS" },
    );

    await sprintService.addIssuesToSprint(sprint.id, org.id, user.id, [
      issueDone.id,
      issuePending.id,
    ]);

    await sprintService.startSprint(sprint.id, org.id, user.id, {
      endDate: new Date().toISOString(),
    });

    const completion = await sprintService.completeSprint(
      sprint.id,
      org.id,
      user.id,
      {
        moveIncompleteTo: "BACKLOG",
      },
    );

    expect(completion.status).toBe("COMPLETED");
    expect(completion.completedPoints).toBe(5);
    expect(completion.incompleteIssuesMoved).toBe(1);

    // Verify pending issue has sprintId set to null (backlog)
    const pendingUpdated = await prisma.issue.findUnique({
      where: { id: issuePending.id },
    });
    expect(pendingUpdated?.sprintId).toBeNull();

    // Verify velocity tracking
    const velocity = await sprintService.getProjectVelocity(
      project.id,
      org.id,
      user.id,
    );
    expect(velocity.completedSprintCount).toBe(1);
    expect(velocity.averageVelocity).toBe(5);
  });

  it("calculates burndown trajectory data", async () => {
    const sprint = await sprintService.createSprint(
      project.id,
      org.id,
      user.id,
      { name: "Burndown Sprint" },
    );

    const issue = await issueService.createIssue(project.id, org.id, user.id, {
      title: "Burndown Issue",
      storyPoints: 10,
    });

    await sprintService.addIssuesToSprint(sprint.id, org.id, user.id, [
      issue.id,
    ]);
    await sprintService.startSprint(sprint.id, org.id, user.id, {
      endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    const burndown = await sprintService.getSprintBurndown(
      sprint.id,
      org.id,
      user.id,
    );
    expect(burndown.sprintId).toBe(sprint.id);
    expect(burndown.totalPoints).toBe(10);
    expect(burndown.burndownDays.length).toBeGreaterThan(0);
    expect(burndown.burndownDays[0].idealRemaining).toBe(10);
  });
});
