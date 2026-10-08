import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";
import { organizationService } from "@/services/organization.service";
import { prisma } from "@/lib/prisma";

describe("Security: Phase 2 Multi-Tenant Project & Issue Isolation", () => {
  const timestamp = Date.now();
  let userA: any;
  let userB: any;
  let orgA: any;
  let orgB: any;
  let projectA: any;
  let projectB: any;
  let issueA: any;
  let issueB: any;

  beforeAll(async () => {
    // User A in Org A
    userA = await prisma.user.create({
      data: {
        name: "Alice Stark",
        email: `alice-sec-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });
    orgA = await organizationService.createOrganization(userA.id, {
      name: "Stark Corp",
      slug: `stark-sec-${timestamp}`,
    });
    projectA = await projectService.createProject(orgA.id, userA.id, {
      name: "Iron Suit",
      key: "SUIT",
    });
    issueA = await issueService.createIssue(projectA.id, orgA.id, userA.id, {
      title: "Arc Reactor power regulation",
      type: "TASK",
      priority: "CRITICAL",
    });

    // User B in Org B
    userB = await prisma.user.create({
      data: {
        name: "Bruce Wayne",
        email: `bruce-sec-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });
    orgB = await organizationService.createOrganization(userB.id, {
      name: "Wayne Enterprises",
      slug: `wayne-sec-${timestamp}`,
    });
    projectB = await projectService.createProject(orgB.id, userB.id, {
      name: "Batmobile",
      key: "BATMOBILE",
    });
    issueB = await issueService.createIssue(projectB.id, orgB.id, userB.id, {
      title: "Afterburner thrust calibrator",
      type: "TASK",
      priority: "HIGH",
    });
  });

  afterAll(async () => {
    if (orgA?.id)
      await prisma.organization.deleteMany({ where: { id: orgA.id } });
    if (orgB?.id)
      await prisma.organization.deleteMany({ where: { id: orgB.id } });
    if (userA?.id) await prisma.user.deleteMany({ where: { id: userA.id } });
    if (userB?.id) await prisma.user.deleteMany({ where: { id: userB.id } });
  });

  it("should prevent User A from accessing Organization B's project", async () => {
    await expect(
      projectService.getProjectById(projectB.id, orgA.id, userA.id),
    ).rejects.toThrow(/not found|access denied/i);

    await expect(
      projectService.getProjectById(projectB.id, orgB.id, userA.id),
    ).rejects.toThrow(/access denied/i);
  });

  it("should prevent User A from modifying or archiving Organization B's project", async () => {
    await expect(
      projectService.updateProject(projectB.id, orgB.id, userA.id, {
        status: "ARCHIVED",
      }),
    ).rejects.toThrow(/access denied/i);

    await expect(
      projectService.updateProject(projectB.id, orgA.id, userA.id, {
        status: "ARCHIVED",
      }),
    ).rejects.toThrow(/not found|access denied/i);
  });

  it("should prevent User A from accessing or reading Organization B's issues", async () => {
    await expect(
      issueService.getIssueById(issueB.id, orgA.id, userA.id),
    ).rejects.toThrow(/not found|access denied/i);

    await expect(
      issueService.getIssueById(issueB.id, orgB.id, userA.id),
    ).rejects.toThrow(/access denied/i);
  });

  it("should prevent User A from modifying Organization B's issues", async () => {
    await expect(
      issueService.updateIssue(issueB.id, orgB.id, userA.id, {
        status: "DONE",
      }),
    ).rejects.toThrow(/access denied/i);
  });

  it("should prevent User A from adding comments on Organization B's issues", async () => {
    await expect(
      issueService.addComment(
        issueB.id,
        orgB.id,
        userA.id,
        "Unauthorized comment from Org A",
      ),
    ).rejects.toThrow(/access denied/i);
  });

  it("should prevent cross-tenant issue relationship linking", async () => {
    // Attempt to link issueA (Org A) to issueB (Org B)
    await expect(
      issueService.createRelationship(
        issueA.id,
        issueB.id,
        "BLOCKS",
        orgA.id,
        userA.id,
      ),
    ).rejects.toThrow(/not found|cross-tenant/i);
  });

  it("should prevent User A from uploading attachments to Organization B's issues", async () => {
    await expect(
      issueService.createAttachment(
        issueB.id,
        orgB.id,
        userA.id,
        "exploit.txt",
        100,
        "text/plain",
        "/uploads/exploit.txt",
      ),
    ).rejects.toThrow(/access denied/i);
  });
});
