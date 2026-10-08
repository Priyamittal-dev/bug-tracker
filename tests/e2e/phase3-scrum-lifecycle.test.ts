import { describe, it, expect } from "vitest";
import { authService } from "@/services/auth.service";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";
import { sprintService } from "@/services/sprint.service";
import { epicService } from "@/services/epic.service";

describe("Phase 3 Agile Scrum & Roadmap End-to-End Lifecycle", () => {
  it("executes the complete Scrum & Roadmap lifecycle", async () => {
    const suffix = Math.random().toString(36).substring(7);
    const email = `scrum-e2e-${suffix}@test.io`;

    // 1. Register User & Provision Org
    const auth = await authService.register({
      name: "Agile Master",
      email,
      password: "Password123!",
      organizationName: `Scrum Corp ${suffix}`,
    });
    const orgId = auth.organization.id;
    const userId = auth.user.id;

    // 2. Create Software Project
    const project = await projectService.createProject(orgId, userId, {
      name: "NextGen Cloud Platform",
      key: `NGC${suffix.toUpperCase().slice(0, 3)}`,
      projectType: "SOFTWARE",
    });
    expect(project.id).toBeDefined();

    // 3. Create Strategic Epic
    const epic = await epicService.createEpic(project.id, orgId, userId, {
      title: "Core Infrastructure Migration",
      description: "Migrate database clusters and enable Redis caching",
      priority: "CRITICAL",
      startDate: new Date().toISOString(),
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    expect(epic.key).toBe(`${project.key}-1`);
    expect(epic.type).toBe("EPIC");

    // 4. Create User Stories linked to Epic with Story Points
    const story1 = await issueService.createIssue(project.id, orgId, userId, {
      title: "Provision Multi-AZ Redis Replication",
      type: "STORY",
      storyPoints: 5,
      epicId: epic.id,
    });
    const story2 = await issueService.createIssue(project.id, orgId, userId, {
      title: "Setup BullMQ Background Worker Pipeline",
      type: "STORY",
      storyPoints: 8,
      epicId: epic.id,
    });
    expect(story1.key).toBe(`${project.key}-2`);
    expect(story2.key).toBe(`${project.key}-3`);

    // 5. Verify Epic Progress is 0% initially
    let epicDetails = await epicService.getEpic(epic.id, orgId, userId);
    expect(epicDetails.totalPoints).toBe(13);
    expect(epicDetails.completedPoints).toBe(0);
    expect(epicDetails.progress).toBe(0);

    // 6. Create Sprint 1 in PLANNING status
    const sprint = await sprintService.createSprint(project.id, orgId, userId, {
      name: "Sprint 1 - Foundation",
      goal: "Establish cache cluster and workers",
    });
    expect(sprint.status).toBe("PLANNING");

    // 7. Add Stories to Sprint 1
    await sprintService.addIssuesToSprint(sprint.id, orgId, userId, [
      story1.id,
      story2.id,
    ]);

    const plannedSprint = await sprintService.getSprint(
      sprint.id,
      orgId,
      userId,
    );
    expect(plannedSprint.issues.length).toBe(2);
    expect(plannedSprint.calculatedTotalPoints).toBe(13);

    // 8. Start Sprint
    const startedSprint = await sprintService.startSprint(
      sprint.id,
      orgId,
      userId,
      {
        endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      },
    );
    expect(startedSprint.status).toBe("ACTIVE");

    // 9. Deliver Story 1 (status -> DONE)
    await issueService.updateIssue(story1.id, orgId, userId, {
      status: "DONE",
    });

    // Verify Epic progress updated dynamically
    epicDetails = await epicService.getEpic(epic.id, orgId, userId);
    expect(epicDetails.completedPoints).toBe(5);
    expect(epicDetails.progress).toBe(Math.round((5 / 13) * 100)); // 38%

    // 10. Complete Sprint (story 2 remains incomplete and moves to Backlog)
    const completion = await sprintService.completeSprint(
      sprint.id,
      orgId,
      userId,
      {
        moveIncompleteTo: "BACKLOG",
      },
    );
    expect(completion.status).toBe("COMPLETED");
    expect(completion.completedPoints).toBe(5);
    expect(completion.incompleteIssuesMoved).toBe(1);

    // 11. Verify Burndown Chart reflects delivery
    const burndown = await sprintService.getSprintBurndown(
      sprint.id,
      orgId,
      userId,
    );
    expect(burndown.totalPoints).toBe(13);
    expect(burndown.burndownDays.length).toBeGreaterThan(0);

    // 12. Verify Project Velocity metric
    const velocity = await sprintService.getProjectVelocity(
      project.id,
      orgId,
      userId,
    );
    expect(velocity.completedSprintCount).toBe(1);
    expect(velocity.averageVelocity).toBe(5);

    // 13. Verify Project Roadmap
    const roadmap = await epicService.getProjectRoadmap(
      project.id,
      orgId,
      userId,
    );
    expect(roadmap.epics.length).toBe(1);
    expect(roadmap.epics[0].progress).toBe(Math.round((5 / 13) * 100));
  });
});
