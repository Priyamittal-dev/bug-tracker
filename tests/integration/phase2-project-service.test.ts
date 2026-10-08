import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { projectService } from "@/services/project.service";
import { organizationService } from "@/services/organization.service";
import { prisma } from "@/lib/prisma";

describe("Integration: Project Service & Project Memberships (Phase 2)", () => {
  const timestamp = Date.now();
  let ownerUser: any;
  let devUser: any;
  let qaUser: any;
  let org1: any;
  let org2: any;
  let project1: any;

  beforeAll(async () => {
    // Create test users
    ownerUser = await prisma.user.create({
      data: {
        name: "Project Director",
        email: `proj-owner-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });

    devUser = await prisma.user.create({
      data: {
        name: "Lead Dev",
        email: `proj-dev-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });

    qaUser = await prisma.user.create({
      data: {
        name: "Senior QA",
        email: `proj-qa-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });

    // Create 2 test orgs
    org1 = await organizationService.createOrganization(ownerUser.id, {
      name: "Stark R&D",
      slug: `stark-rd-${timestamp}`,
    });

    org2 = await organizationService.createOrganization(ownerUser.id, {
      name: "Wayne Tech",
      slug: `wayne-tech-${timestamp}`,
    });

    // Add devUser and qaUser to org1
    await organizationService.addMember(org1.id, ownerUser.id, {
      userId: devUser.id,
      role: "DEVELOPER",
    });

    await organizationService.addMember(org1.id, ownerUser.id, {
      userId: qaUser.id,
      role: "DEVELOPER",
    });
  });

  afterAll(async () => {
    if (org1?.id)
      await prisma.organization.deleteMany({ where: { id: org1.id } });
    if (org2?.id)
      await prisma.organization.deleteMany({ where: { id: org2.id } });
    if (ownerUser?.id)
      await prisma.user.deleteMany({ where: { id: ownerUser.id } });
    if (devUser?.id)
      await prisma.user.deleteMany({ where: { id: devUser.id } });
    if (qaUser?.id) await prisma.user.deleteMany({ where: { id: qaUser.id } });
  });

  it("should create a new project with a unique uppercase key", async () => {
    project1 = await projectService.createProject(org1.id, ownerUser.id, {
      name: "Falcon Spacecraft",
      key: "FALCON",
      description: "Next-gen flight management system",
      category: "Aerospace",
      projectType: "SOFTWARE",
    });

    expect(project1).toBeDefined();
    expect(project1.key).toBe("FALCON");
    expect(project1.name).toBe("Falcon Spacecraft");
    expect(project1.organizationId).toBe(org1.id);

    // Verify creator is added as PROJECT_ADMIN
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project1.id,
          userId: ownerUser.id,
        },
      },
    });
    expect(member?.role).toBe("PROJECT_ADMIN");
  });

  it("should reject creating a project with a duplicate key in the same organization", async () => {
    await expect(
      projectService.createProject(org1.id, ownerUser.id, {
        name: "Falcon Duplicate",
        key: "FALCON",
      }),
    ).rejects.toThrow(/already in use/i);
  });

  it("should permit creating a project with the same key in a different organization", async () => {
    const projectInOrg2 = await projectService.createProject(
      org2.id,
      ownerUser.id,
      {
        name: "Wayne Falcon",
        key: "FALCON",
      },
    );

    expect(projectInOrg2).toBeDefined();
    expect(projectInOrg2.organizationId).toBe(org2.id);
    expect(projectInOrg2.key).toBe("FALCON");
  });

  it("should add members with project-specific roles", async () => {
    const member = await projectService.addMember(
      project1.id,
      org1.id,
      ownerUser.id,
      {
        userId: devUser.id,
        role: "DEVELOPER",
      },
    );

    expect(member).toBeDefined();
    expect(member.role).toBe("DEVELOPER");
    expect(member.userId).toBe(devUser.id);

    const qaMember = await projectService.addMember(
      project1.id,
      org1.id,
      ownerUser.id,
      {
        userId: qaUser.id,
        role: "QA_ENGINEER",
      },
    );
    expect(qaMember.role).toBe("QA_ENGINEER");
  });

  it("should list project members and update a member's role", async () => {
    const members = await projectService.listMembers(
      project1.id,
      org1.id,
      ownerUser.id,
    );
    expect(members.length).toBe(3); // owner + dev + qa

    const updated = await projectService.updateMemberRole(
      project1.id,
      devUser.id,
      org1.id,
      ownerUser.id,
      "PROJECT_MANAGER",
    );
    expect(updated.role).toBe("PROJECT_MANAGER");
  });

  it("should update project details and archive the project", async () => {
    const updated = await projectService.updateProject(
      project1.id,
      org1.id,
      ownerUser.id,
      {
        description: "Updated spacecraft avionics",
        status: "ARCHIVED",
      },
    );

    expect(updated.description).toBe("Updated spacecraft avionics");
    expect(updated.status).toBe("ARCHIVED");

    // Reactivate
    const reactivated = await projectService.updateProject(
      project1.id,
      org1.id,
      ownerUser.id,
      {
        status: "ACTIVE",
      },
    );
    expect(reactivated.status).toBe("ACTIVE");
  });

  it("should search and list projects within the organization", async () => {
    const list = await projectService.listProjects(org1.id, ownerUser.id, {
      search: "Falcon",
    });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].key).toBe("FALCON");
  });
});
