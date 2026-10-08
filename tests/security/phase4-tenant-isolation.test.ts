import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";
import { ReleaseService } from "@/services/release.service";
import { TimeTrackingService } from "@/services/time-tracking.service";
import { workflowService } from "@/services/workflow.service";
import { customFieldService } from "@/services/custom-field.service";
import { slaService } from "@/services/sla.service";

describe("Phase 4 Security & Multi-Tenant Isolation Tests", () => {
  let orgA: any;
  let userA: any;
  let projectA: any;
  let issueA: any;
  let releaseA: any;
  let timeLogA: any;

  let orgB: any;
  let userB: any;

  beforeEach(async () => {
    const suffix = Math.random().toString(36).substring(7);

    // Org A setup
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
    issueA = await issueService.createIssue(projectA.id, orgA.id, userA.id, {
      title: "Confidential security vulnerability",
    });
    releaseA = await ReleaseService.createRelease(
      userA.id,
      orgA.id,
      projectA.id,
      {
        version: "v1.0.0",
        name: "Secret Release",
      },
    );
    timeLogA = await TimeTrackingService.logTime(userA.id, orgA.id, issueA.id, {
      timeSpent: 3.0,
      description: "Confidential client engineering work",
      billable: true,
    });

    // Org B setup
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

  it("blocks User B from fetching Org A releases", async () => {
    await expect(
      ReleaseService.getRelease(orgB.id, releaseA.id),
    ).rejects.toThrow(/Release not found/);
  });

  it("blocks User B from modifying Org A releases", async () => {
    await expect(
      ReleaseService.updateRelease(userB.id, orgB.id, releaseA.id, {
        name: "Tampered Name",
      }),
    ).rejects.toThrow(/Release not found/);

    await expect(
      ReleaseService.deleteRelease(userB.id, orgB.id, releaseA.id),
    ).rejects.toThrow(/Release not found/);
  });

  it("blocks User B from deleting Org A time logs", async () => {
    await expect(
      TimeTrackingService.deleteTimeLog(
        userB.id,
        orgB.id,
        timeLogA.id,
        "ORGANIZATION_OWNER",
      ),
    ).rejects.toThrow(/Time log not found/);
  });

  it("blocks User B from reading Org A custom fields or issue fields", async () => {
    await expect(
      customFieldService.getIssueCustomFields(issueA.id, orgB.id, userB.id),
    ).rejects.toThrow();
  });

  it("blocks User B from viewing Org A SLA metrics", async () => {
    await expect(slaService.getSlaMetrics(orgA.id, userB.id)).rejects.toThrow(
      /Access denied/,
    );
  });

  it("blocks User B from viewing Org A workflows", async () => {
    await expect(
      workflowService.listWorkflows(orgA.id, userB.id),
    ).rejects.toThrow(/Access denied/);
  });
});
