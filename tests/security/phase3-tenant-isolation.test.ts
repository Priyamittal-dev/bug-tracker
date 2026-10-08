import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { sprintService } from "@/services/sprint.service";
import { epicService } from "@/services/epic.service";
import { projectService } from "@/services/project.service";

describe("Phase 3 Agile & Scrum Security & Tenant Isolation Tests", () => {
  let orgA: any;
  let userA: any;
  let projectA: any;
  let sprintA: any;
  let epicA: any;

  let orgB: any;
  let userB: any;

  beforeEach(async () => {
    const suffix = Math.random().toString(36).substring(7);

    // Org A
    userA = await prisma.user.create({
      data: {
        name: `User A ${suffix}`,
        email: `user-a-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });
    orgA = await prisma.organization.create({
      data: {
        name: `Org A ${suffix}`,
        slug: `org-a-${suffix}`,
        status: "ACTIVE",
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: userA.id,
        role: "ORGANIZATION_OWNER",
        status: "ACTIVE",
      },
    });
    projectA = await projectService.createProject(orgA.id, userA.id, {
      name: "Project A",
      key: `PROJA${suffix.toUpperCase().slice(0, 3)}`,
    });
    sprintA = await sprintService.createSprint(projectA.id, orgA.id, userA.id, {
      name: "Org A Sprint",
    });
    epicA = await epicService.createEpic(projectA.id, orgA.id, userA.id, {
      title: "Org A Epic",
    });

    // Org B
    userB = await prisma.user.create({
      data: {
        name: `User B ${suffix}`,
        email: `user-b-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });
    orgB = await prisma.organization.create({
      data: {
        name: `Org B ${suffix}`,
        slug: `org-b-${suffix}`,
        status: "ACTIVE",
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgB.id,
        userId: userB.id,
        role: "ORGANIZATION_OWNER",
        status: "ACTIVE",
      },
    });
  });

  it("blocks User B from fetching Org A sprint", async () => {
    await expect(
      sprintService.getSprint(sprintA.id, orgB.id, userB.id),
    ).rejects.toThrow(/Sprint not found/);
  });

  it("blocks User B from starting or completing Org A sprint", async () => {
    await expect(
      sprintService.startSprint(sprintA.id, orgB.id, userB.id, {
        endDate: new Date().toISOString(),
      }),
    ).rejects.toThrow(/Sprint not found/);

    await expect(
      sprintService.completeSprint(sprintA.id, orgB.id, userB.id, {
        moveIncompleteTo: "BACKLOG",
      }),
    ).rejects.toThrow(/Sprint not found/);
  });

  it("blocks User B from fetching Org A Epic", async () => {
    await expect(
      epicService.getEpic(epicA.id, orgB.id, userB.id),
    ).rejects.toThrow(/Epic not found/);
  });

  it("blocks User B from accessing Org A project roadmap", async () => {
    await expect(
      epicService.getProjectRoadmap(projectA.id, orgB.id, userB.id),
    ).rejects.toThrow(/Access denied/);
  });
});
