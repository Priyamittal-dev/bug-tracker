import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import {
  CreateOrgInput,
  UpdateOrgInput,
  InviteMemberInput,
  UpdateRoleInput,
} from "@/lib/validations/org";
import { logger } from "@/lib/logger";

export class OrganizationService {
  /**
   * Creates a new organization and grants the creator the ORGANIZATION_OWNER role.
   */
  async createOrganization(userId: string, input: CreateOrgInput) {
    const baseSlug = (input.slug || input.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug,
          status: "ACTIVE",
          plan: "FREE",
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: org.id,
          userId,
          role: "ORGANIZATION_OWNER",
          status: "ACTIVE",
        },
      });

      await tx.team.create({
        data: {
          organizationId: org.id,
          name: "Engineering",
          description: "Core software engineering squad",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorUserId: userId,
          action: "ORGANIZATION_CREATED",
          resourceType: "ORGANIZATION",
          resourceId: org.id,
          details: JSON.stringify({ name: org.name, slug: org.slug }),
        },
      });

      return { org, membership };
    });

    logger.info("Organization created", {
      event: "ORG_CREATED",
      userId,
      organizationId: result.org.id,
    });

    const { billingService } = await import("@/services/billing.service");
    const owner = await prisma.user.findUnique({ where: { id: userId } });
    await billingService.ensureAccount(
      result.org.id,
      owner?.email || `billing@${result.org.slug}.local`,
    );

    return result.org;
  }

  /**
   * Fetches organization by ID with membership verification.
   */
  async getOrganization(orgId: string, userId: string) {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      const error: any = new Error(
        "Access denied: Not an active member of this organization",
      );
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    return {
      ...membership.organization,
      currentUserRole: membership.role,
    };
  }

  /**
   * Lists all organizations for a specific user.
   */
  async getUserOrganizations(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                memberships: true,
                projects: true,
                teams: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Updates organization profile (requires organization.update permission).
   */
  async updateOrganization(
    orgId: string,
    userId: string,
    input: UpdateOrgInput,
  ) {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership || !hasPermission(membership.role, "organization.update")) {
      const error: any = new Error(
        "Forbidden: Missing organization.update permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: userId,
        action: "ORGANIZATION_UPDATED",
        resourceType: "ORGANIZATION",
        resourceId: orgId,
        details: JSON.stringify(input),
      },
    });

    logger.info("Organization updated", {
      event: "ORG_UPDATED",
      organizationId: orgId,
      userId,
    });
    return updated;
  }

  /**
   * Lists all members of an organization.
   */
  async getOrganizationMembers(orgId: string, userId: string) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!callerMembership) {
      const error: any = new Error("Access denied: Not an organization member");
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    const members = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            jobTitle: true,
            status: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const pendingInvitations = await prisma.invitation.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      include: {
        inviter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        jobTitle: m.user.jobTitle,
        role: m.role,
        status: m.status,
        joinedAt: m.createdAt,
      })),
      pendingInvitations: pendingInvitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        inviter: inv.inviter.name,
      })),
    };
  }

  /**
   * Invites or directly adds a member to the organization.
   */
  async inviteMember(
    orgId: string,
    inviterId: string,
    input: InviteMemberInput,
  ) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: inviterId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "organization.members.manage")
    ) {
      const error: any = new Error(
        "Forbidden: Missing organization.members.manage permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (targetUser) {
      // Check if already a member
      const existingMembership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: targetUser.id,
          },
        },
      });

      if (existingMembership) {
        const error: any = new Error(
          "User is already a member of this organization",
        );
        error.code = "ALREADY_MEMBER";
        error.status = 400;
        throw error;
      }

      // Add user directly as active member
      const membership = await prisma.membership.create({
        data: {
          organizationId: orgId,
          userId: targetUser.id,
          role: input.role,
          status: "ACTIVE",
        },
        include: { user: true },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: inviterId,
          action: "MEMBER_ADDED",
          resourceType: "MEMBERSHIP",
          resourceId: membership.id,
          details: JSON.stringify({ userId: targetUser.id, role: input.role }),
        },
      });

      logger.info("Member added to organization", {
        event: "MEMBER_ADDED",
        organizationId: orgId,
        targetUserId: targetUser.id,
        role: input.role,
      });

      return {
        type: "MEMBER_ADDED",
        membership: {
          id: membership.id,
          userId: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: membership.role,
        },
      };
    }

    // User does not exist yet: create pending invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: input.email,
        role: input.role,
        token,
        expiresAt,
        inviterId,
        status: "PENDING",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: inviterId,
        action: "INVITATION_SENT",
        resourceType: "INVITATION",
        resourceId: invitation.id,
        details: JSON.stringify({ email: input.email, role: input.role }),
      },
    });

    logger.info("Invitation dispatched", {
      event: "INVITATION_CREATED",
      organizationId: orgId,
      email: input.email,
    });

    return {
      type: "INVITATION_CREATED",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        token: process.env.NODE_ENV !== "production" ? token : undefined,
      },
    };
  }

  /**
   * Updates an existing member's role.
   */
  async updateMemberRole(
    orgId: string,
    currentUserId: string,
    input: UpdateRoleInput,
  ) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: currentUserId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "organization.roles.manage")
    ) {
      const error: any = new Error(
        "Forbidden: Missing organization.roles.manage permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: input.userId,
        },
      },
    });

    if (!targetMembership) {
      const error: any = new Error("Member not found in organization");
      error.code = "MEMBER_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Safety constraint: Prevent demoting the last owner
    if (
      (targetMembership.role === "ORGANIZATION_OWNER" ||
        targetMembership.role === "OWNER") &&
      input.role !== "ORGANIZATION_OWNER" &&
      input.role !== "OWNER"
    ) {
      const ownerCount = await prisma.membership.count({
        where: {
          organizationId: orgId,
          role: { in: ["ORGANIZATION_OWNER", "OWNER"] },
        },
      });
      if (ownerCount <= 1) {
        const error: any = new Error(
          "Cannot demote the only organization owner",
        );
        error.code = "LAST_OWNER_PROTECTION";
        error.status = 400;
        throw error;
      }
    }

    const updated = await prisma.membership.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: input.userId,
        },
      },
      data: { role: input.role },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: currentUserId,
        action: "ROLE_UPDATED",
        resourceType: "MEMBERSHIP",
        resourceId: updated.id,
        details: JSON.stringify({
          userId: input.userId,
          oldRole: targetMembership.role,
          newRole: input.role,
        }),
      },
    });

    logger.info("Member role updated", {
      event: "ROLE_UPDATED",
      organizationId: orgId,
      targetUserId: input.userId,
      newRole: input.role,
    });

    return updated;
  }

  /**
   * Removes a member from the organization.
   */
  async removeMember(
    orgId: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: currentUserId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "organization.members.manage")
    ) {
      const error: any = new Error(
        "Forbidden: Missing organization.members.manage permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      const error: any = new Error("Member not found in organization");
      error.code = "MEMBER_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Safety: Cannot remove the last owner
    if (
      targetMembership.role === "ORGANIZATION_OWNER" ||
      targetMembership.role === "OWNER"
    ) {
      const ownerCount = await prisma.membership.count({
        where: {
          organizationId: orgId,
          role: { in: ["ORGANIZATION_OWNER", "OWNER"] },
        },
      });
      if (ownerCount <= 1) {
        const error: any = new Error(
          "Cannot remove the only organization owner",
        );
        error.code = "LAST_OWNER_PROTECTION";
        error.status = 400;
        throw error;
      }
    }

    await prisma.$transaction([
      prisma.membership.delete({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: targetUserId,
          },
        },
      }),
      // Remove user from all teams within this organization
      prisma.teamMember.deleteMany({
        where: {
          userId: targetUserId,
          team: { organizationId: orgId },
        },
      }),
      prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: currentUserId,
          action: "MEMBER_REMOVED",
          resourceType: "MEMBERSHIP",
          resourceId: targetMembership.id,
          details: JSON.stringify({ userId: targetUserId }),
        },
      }),
    ]);

    logger.info("Member removed from organization", {
      event: "MEMBER_REMOVED",
      organizationId: orgId,
      targetUserId,
    });

    return { success: true };
  }

  /**
   * Adds an existing user directly to the organization.
   */
  async addMember(
    orgId: string,
    callerId: string,
    input: { userId: string; role: any },
  ) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error("User not found");
    return this.inviteMember(orgId, callerId, {
      email: user.email,
      role: input.role,
    });
  }
}

export const organizationService = new OrganizationService();
