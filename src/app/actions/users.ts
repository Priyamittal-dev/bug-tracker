"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  return user;
}

export async function getUsers() {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  // Return users belonging to this tenant/organization
  const memberships = await prisma.membership.findMany({
    where: { organizationId: tenant.organizationId },
    include: {
      user: true,
    },
    orderBy: {
      user: { name: "asc" },
    },
  });

  return memberships.map((m) => ({
    ...m.user,
    role: m.role, // RBAC role in this org (OWNER, ADMIN, MEMBER, GUEST)
  }));
}
