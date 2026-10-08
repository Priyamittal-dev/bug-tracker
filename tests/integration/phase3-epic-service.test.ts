import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { epicService } from "@/services/epic.service";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";

describe("Phase 3 EpicService Integration Tests", () => {
  let org: any;
  let user: any;
  let project: any;

  beforeEach(async () => {
    const suffix = Math.random().toString(36).substring(7);
    user = await prisma.user.create({
      data: {
        name: `Product Lead ${suffix}`,
        email: `epic-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });

    org = await prisma.organization.create({
      data: {
        name: `Epic Org ${suffix}`,
        slug: `epic-org-${suffix}`,
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
      name: "Roadmap Platform",
      key: `RDMP${suffix.toUpperCase().slice(0, 3)}`,
      category: "Software Development",
    });
  });

  it("creates an Epic with sequential key and dates", async () => {
    const epic = await epicService.createEpic(project.id, org.id, user.id, {
      title: "Enterprise SSO Integration",
      description: "Okta and Azure AD SAML SSO support",
      priority: "CRITICAL",
      startDate: new Date().toISOString(),
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    expect(epic.id).toBeDefined();
    expect(epic.key).toMatch(new RegExp(`^${project.key}-\\d+$`));
    expect(epic.type).toBe("EPIC");
    expect(epic.title).toBe("Enterprise SSO Integration");
  });

  it("assigns child issues and calculates Epic completion progress", async () => {
    const epic = await epicService.createEpic(project.id, org.id, user.id, {
      title: "Billing Engine Overhaul",
    });

    const child1 = await issueService.createIssue(project.id, org.id, user.id, {
      title: "Stripe Webhooks",
      type: "STORY",
      storyPoints: 5,
      status: "DONE",
    });
    const child2 = await issueService.createIssue(project.id, org.id, user.id, {
      title: "Invoice PDF Generator",
      type: "TASK",
      storyPoints: 5,
      status: "TODO",
    });

    await epicService.assignIssuesToEpic(epic.id, org.id, user.id, [
      child1.id,
      child2.id,
    ]);

    const fetched = await epicService.getEpic(epic.id, org.id, user.id);
    expect(fetched.totalIssues).toBe(2);
    expect(fetched.completedIssues).toBe(1);
    expect(fetched.totalPoints).toBe(10);
    expect(fetched.completedPoints).toBe(5);
    expect(fetched.progress).toBe(50); // 5 / 10 points = 50%
  });

  it("lists project epics and generates roadmap data", async () => {
    await epicService.createEpic(project.id, org.id, user.id, {
      title: "Epic 1",
      priority: "HIGH",
    });
    await epicService.createEpic(project.id, org.id, user.id, {
      title: "Epic 2",
      priority: "MEDIUM",
    });

    const epics = await epicService.listProjectEpics(
      project.id,
      org.id,
      user.id,
    );
    expect(epics.length).toBe(2);

    const roadmap = await epicService.getProjectRoadmap(
      project.id,
      org.id,
      user.id,
    );
    expect(roadmap.projectId).toBe(project.id);
    expect(roadmap.epics.length).toBe(2);
  });
});
