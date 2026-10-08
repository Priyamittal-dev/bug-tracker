export type Role =
  | "ORGANIZATION_OWNER"
  | "ORGANIZATION_ADMIN"
  | "PROJECT_ADMIN"
  | "PROJECT_MANAGER"
  | "DEVELOPER"
  | "QA_ENGINEER"
  | "PRODUCT_MANAGER"
  | "REPORTER"
  | "VIEWER"
  | "GUEST"
  // Legacy aliases
  | "OWNER"
  | "ADMIN"
  | "MEMBER";

export type Permission =
  // Organization permissions
  | "organization.read"
  | "organization.update"
  | "organization.delete"
  | "organization.members.manage"
  | "organization.roles.manage"
  // Team permissions
  | "team.read"
  | "team.create"
  | "team.update"
  | "team.delete"
  | "team.members.manage"
  // User profile permissions
  | "user.read"
  | "user.update"
  // Extensible Project & Issue permissions (Phase 1 placeholders)
  | "project.read"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "issue.read"
  | "issue.create"
  | "issue.update"
  | "issue.delete"
  | "issue.comment"
  // Legacy aliases for backwards compatibility with earlier draft actions
  | "org:manage"
  | "org:delete"
  | "members:invite"
  | "members:remove"
  | "members:update_role"
  | "teams:create"
  | "teams:edit"
  | "teams:delete"
  | "projects:create"
  | "projects:edit"
  | "projects:delete"
  | "issues:create"
  | "issues:edit"
  | "issues:delete"
  | "issues:comment"
  | "analytics:view";

/**
 * Normalizes role string to canonical uppercase format.
 */
export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return "GUEST";
  const upper = role.trim().toUpperCase();
  if (upper === "OWNER") return "ORGANIZATION_OWNER";
  if (upper === "ADMIN") return "ORGANIZATION_ADMIN";
  if (upper === "MEMBER") return "DEVELOPER";
  return upper as Role;
}

/**
 * Mapping of permissions per canonical role.
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ORGANIZATION_OWNER: [
    "organization.read",
    "organization.update",
    "organization.delete",
    "organization.members.manage",
    "organization.roles.manage",
    "team.read",
    "team.create",
    "team.update",
    "team.delete",
    "team.members.manage",
    "user.read",
    "user.update",
    "project.read",
    "project.create",
    "project.update",
    "project.delete",
    "issue.read",
    "issue.create",
    "issue.update",
    "issue.delete",
    "issue.comment",
    // Legacy
    "org:manage",
    "org:delete",
    "members:invite",
    "members:remove",
    "members:update_role",
    "teams:create",
    "teams:edit",
    "teams:delete",
    "projects:create",
    "projects:edit",
    "projects:delete",
    "issues:create",
    "issues:edit",
    "issues:delete",
    "issues:comment",
    "analytics:view",
  ],

  ORGANIZATION_ADMIN: [
    "organization.read",
    "organization.update",
    "organization.members.manage",
    "organization.roles.manage",
    "team.read",
    "team.create",
    "team.update",
    "team.delete",
    "team.members.manage",
    "user.read",
    "user.update",
    "project.read",
    "project.create",
    "project.update",
    "project.delete",
    "issue.read",
    "issue.create",
    "issue.update",
    "issue.delete",
    "issue.comment",
    // Legacy
    "org:manage",
    "members:invite",
    "members:remove",
    "members:update_role",
    "teams:create",
    "teams:edit",
    "teams:delete",
    "projects:create",
    "projects:edit",
    "projects:delete",
    "issues:create",
    "issues:edit",
    "issues:delete",
    "issues:comment",
    "analytics:view",
  ],

  PROJECT_ADMIN: [
    "organization.read",
    "team.read",
    "user.read",
    "project.read",
    "project.create",
    "project.update",
    "issue.read",
    "issue.create",
    "issue.update",
    "issue.delete",
    "issue.comment",
    "projects:create",
    "projects:edit",
    "issues:create",
    "issues:edit",
    "issues:delete",
    "issues:comment",
    "analytics:view",
  ],

  PROJECT_MANAGER: [
    "organization.read",
    "team.read",
    "user.read",
    "project.read",
    "project.update",
    "issue.read",
    "issue.create",
    "issue.update",
    "issue.comment",
    "issues:create",
    "issues:edit",
    "issues:comment",
    "analytics:view",
  ],

  DEVELOPER: [
    "organization.read",
    "team.read",
    "user.read",
    "project.read",
    "issue.read",
    "issue.create",
    "issue.update",
    "issue.comment",
    "issues:create",
    "issues:edit",
    "issues:comment",
    "analytics:view",
  ],

  QA_ENGINEER: [
    "organization.read",
    "team.read",
    "user.read",
    "project.read",
    "issue.read",
    "issue.create",
    "issue.update",
    "issue.comment",
    "issues:create",
    "issues:edit",
    "issues:comment",
    "analytics:view",
  ],

  PRODUCT_MANAGER: [
    "organization.read",
    "team.read",
    "user.read",
    "project.read",
    "issue.read",
    "issue.create",
    "issue.update",
    "issue.comment",
    "issues:create",
    "issues:edit",
    "issues:comment",
    "analytics:view",
  ],

  REPORTER: [
    "organization.read",
    "team.read",
    "user.read",
    "project.read",
    "issue.read",
    "issue.create",
    "issue.comment",
    "issues:create",
    "issues:comment",
  ],

  VIEWER: [
    "organization.read",
    "team.read",
    "user.read",
    "project.read",
    "issue.read",
  ],

  GUEST: ["organization.read", "issue.read"],
};

// Aliases for backwards compatibility
ROLE_PERMISSIONS.OWNER = ROLE_PERMISSIONS.ORGANIZATION_OWNER;
ROLE_PERMISSIONS.ADMIN = ROLE_PERMISSIONS.ORGANIZATION_ADMIN;
ROLE_PERMISSIONS.MEMBER = ROLE_PERMISSIONS.DEVELOPER;

/**
 * Checks whether a given role holds a specific permission.
 */
export function hasPermission(
  role: Role | string | undefined | null,
  permission: Permission,
): boolean {
  if (!role) return false;
  const canonical = normalizeRole(role);
  const permissions =
    ROLE_PERMISSIONS[canonical] || ROLE_PERMISSIONS[role.toUpperCase()];
  if (!permissions) return false;

  if (permissions.includes(permission)) return true;

  // Normalize check for dot vs colon notation
  const mappedDot: Record<string, Permission> = {
    "org:manage": "organization.update",
    "org:delete": "organization.delete",
    "members:invite": "organization.members.manage",
    "members:remove": "organization.members.manage",
    "members:update_role": "organization.roles.manage",
    "teams:create": "team.create",
    "teams:edit": "team.update",
    "teams:delete": "team.delete",
    "projects:create": "project.create",
    "projects:edit": "project.update",
    "projects:delete": "project.delete",
    "issues:create": "issue.create",
    "issues:edit": "issue.update",
    "issues:delete": "issue.delete",
    "issues:comment": "issue.comment",
  };

  const mapped = mappedDot[permission];
  if (mapped && permissions.includes(mapped)) return true;

  return false;
}

export function canManageOrganization(
  role: Role | string | undefined | null,
): boolean {
  return hasPermission(role, "organization.update");
}

export function canManageMembers(
  role: Role | string | undefined | null,
): boolean {
  return hasPermission(role, "organization.members.manage");
}

export function canManageRoles(
  role: Role | string | undefined | null,
): boolean {
  return hasPermission(role, "organization.roles.manage");
}

export function canManageTeams(
  role: Role | string | undefined | null,
): boolean {
  return hasPermission(role, "team.create");
}

export function canCreateProject(
  role: Role | string | undefined | null,
): boolean {
  return hasPermission(role, "project.create");
}

export function canDeleteIssue(
  role: Role | string | undefined | null,
): boolean {
  return hasPermission(role, "issue.delete");
}

export function hasProjectPermission(
  orgOrProjectRole: Role | string | undefined | null,
  projectRoleOrPermission: Role | string | undefined | null,
  permissionArg?: Permission,
): boolean {
  if (permissionArg) {
    const orgRole = orgOrProjectRole;
    const projectRole = projectRoleOrPermission;
    if (hasPermission(orgRole, permissionArg)) return true;
    if (projectRole && hasPermission(projectRole, permissionArg)) return true;
    return false;
  } else {
    const role = orgOrProjectRole;
    const perm = projectRoleOrPermission as Permission;
    return hasPermission(role, perm);
  }
}
