import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export type TenantContext = {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  role: string; // OWNER, ADMIN, MEMBER, GUEST
  userRole: string;
};

export async function getCurrentUserWithOrgs() {
  const session = await auth();
  if (!session?.user?.email) return null;

  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          organization: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) return null;

  // Auto-provision workspace for OAuth users (e.g. Google Sign-In) who don't have an organization yet
  if (user.memberships.length === 0) {
    try {
      const rawName = user.name || user.email.split("@")[0] || "My Workspace";
      const orgName = `${rawName}'s Workspace`;
      const baseSlug = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 20);
      const slug = `${baseSlug || "workspace"}-${Date.now().toString(36)}`;

      // Find existing demo organization to attach as secondary access
      const demoOrg = await prisma.organization.findFirst({
        where: { name: "CloudDesk Global" },
      });

      // Create their primary organization
      const newOrg = await prisma.organization.create({
        data: {
          name: orgName,
          slug,
          plan: "PRO",
        },
      });

      await prisma.membership.create({
        data: {
          organizationId: newOrg.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Link to demo org as ADMIN if available
      if (demoOrg && demoOrg.id !== newOrg.id) {
        await prisma.membership.create({
          data: {
            organizationId: demoOrg.id,
            userId: user.id,
            role: "ADMIN",
          },
        }).catch(() => null);
      }

      // Create starter project
      const projKey = rawName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "PRO");
      await prisma.project.create({
        data: {
          organizationId: newOrg.id,
          name: `${rawName} Primary Project`,
          key: projKey.length < 2 ? "APP" : projKey,
          category: "Software Application",
          status: "ACTIVE",
        },
      }).catch(() => null);

      // Refresh user with new memberships
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          memberships: {
            include: {
              organization: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    } catch (err) {
      console.error("Auto-provision error for user:", err);
    }
  }

  return user;
}

export async function getActiveOrganizationId(): Promise<string | null> {
  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get("active_org_id")?.value;

  const user = await getCurrentUserWithOrgs();
  if (!user || user.memberships.length === 0) return null;

  // If cookie exists and user is a member of that org, use it
  if (activeOrgCookie) {
    const isMember = user.memberships.some(
      (m) => m.organizationId === activeOrgCookie,
    );
    if (isMember) return activeOrgCookie;
  }

  // Fallback to first organization
  return user.memberships[0].organizationId;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const user = await getCurrentUserWithOrgs();
  if (!user || user.memberships.length === 0) return null;

  const activeOrgId = await getActiveOrganizationId();
  if (!activeOrgId) return null;

  const currentMembership = user.memberships.find(
    (m) => m.organizationId === activeOrgId,
  );
  if (!currentMembership) return null;

  return {
    userId: user.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      jobTitle: user.jobTitle,
    },
    organizationId: currentMembership.organizationId,
    organization: {
      id: currentMembership.organization.id,
      name: currentMembership.organization.name,
      slug: currentMembership.organization.slug,
      plan: currentMembership.organization.plan,
    },
    role: currentMembership.role,
    userRole: currentMembership.role,
  };
}

export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Unauthorized: Tenant context required");
  }
  return context;
}
