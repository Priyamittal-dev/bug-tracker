"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext, requireTenantContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/rbac";

export async function getProjects() {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  return prisma.project.findMany({
    where: {
      organizationId: tenant.organizationId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          issues: true,
          milestones: true,
        },
      },
      issues: {
        select: {
          id: true,
          status: true,
          severity: true,
        },
      },
      milestones: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });
}

export async function getProject(id: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  return prisma.project.findFirst({
    where: {
      organizationId: tenant.organizationId,
      OR: [{ id }, { key: id.toUpperCase() }],
    },
    include: {
      milestones: true,
      _count: {
        select: { issues: true },
      },
    },
  });
}

export async function createProject(formData: FormData) {
  const tenant = await requireTenantContext();

  // RBAC Permission Check
  if (!hasPermission(tenant.role, "projects:create")) {
    throw new Error(
      "Forbidden: You do not have permission to create projects in this workspace",
    );
  }

  const name = formData.get("name") as string;
  const key = (
    (formData.get("key") as string) || name.slice(0, 4).toUpperCase()
  )
    .trim()
    .toUpperCase();
  const description = formData.get("description") as string;
  const category = (formData.get("category") as string) || "Web Application";

  if (!name) throw new Error("Name is required");
  if (!key) throw new Error("Project Key is required");

  // Check key uniqueness within this organization
  const existing = await prisma.project.findUnique({
    where: {
      organizationId_key: {
        organizationId: tenant.organizationId,
        key,
      },
    },
  });

  if (existing) {
    throw new Error(
      `Project with key '${key}' already exists in this workspace`,
    );
  }

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        organizationId: tenant.organizationId,
        name,
        key,
        description,
        category,
        status: "ACTIVE",
      },
    });

    await tx.projectMember.create({
      data: {
        projectId: p.id,
        userId: tenant.userId,
        role: "MANAGER",
      },
    });

    return p;
  });

  revalidatePath("/projects");
  revalidatePath("/");
  return project;
}
