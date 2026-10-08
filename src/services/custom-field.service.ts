import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { CreateCustomFieldInput } from "@/lib/validations/custom-field";

export class CustomFieldService {
  private async verifyOrgAccess(orgId: string, userId: string) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!membership || membership.status !== "ACTIVE") {
      const error: any = new Error("Access denied: Not an organization member");
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    return membership;
  }

  /**
   * Creates a custom field definition.
   */
  async createCustomField(
    orgId: string,
    userId: string,
    input: CreateCustomFieldInput,
    projectId?: string,
  ) {
    await this.verifyOrgAccess(orgId, userId);

    const existing = await prisma.customField.findFirst({
      where: { organizationId: orgId, fieldKey: input.fieldKey },
    });

    if (existing) {
      const error: any = new Error(
        `Custom field with key "${input.fieldKey}" already exists`,
      );
      error.code = "DUPLICATE_FIELD_KEY";
      error.status = 409;
      throw error;
    }

    const field = await prisma.customField.create({
      data: {
        organizationId: orgId,
        projectId: projectId || null,
        name: input.name,
        fieldKey: input.fieldKey.toLowerCase(),
        type: input.type,
        description: input.description,
        options: input.options ? JSON.stringify(input.options) : null,
        defaultValue: input.defaultValue,
        isRequired: input.isRequired,
      },
    });

    logger.info("Custom field created", {
      event: "CUSTOM_FIELD_CREATED",
      fieldId: field.id,
      fieldKey: field.fieldKey,
      organizationId: orgId,
    });

    return field;
  }

  /**
   * Sets or updates a custom field value on an issue with flexible argument support.
   */
  async setFieldValue(
    issueId: string,
    arg2: string,
    arg3: any,
    arg4?: string,
    arg5?: string,
  ) {
    if (arg4 && arg5) {
      // (issueId, fieldId, value, orgId, userId)
      return this.setCustomFieldValue(issueId, arg4, arg5, arg2, String(arg3));
    }
    // (issueId, orgId, userId, fieldId, value)
    return this.setCustomFieldValue(
      issueId,
      arg2,
      arg3,
      arg4 || "",
      arg5 || null,
    );
  }

  /**
   * Sets or updates a custom field value on an issue.
   */
  async setCustomFieldValue(
    issueId: string,
    orgId: string,
    userId: string,
    customFieldId: string,
    value: string | null,
  ) {
    await this.verifyOrgAccess(orgId, userId);

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });

    if (!issue) {
      const error: any = new Error("Issue not found");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const field = await prisma.customField.findFirst({
      where: { id: customFieldId, organizationId: orgId },
    });

    if (!field) {
      const error: any = new Error("Custom field not found");
      error.code = "CUSTOM_FIELD_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Upsert value
    const fieldValue = await prisma.customFieldValue.upsert({
      where: {
        issueId_customFieldId: {
          issueId,
          customFieldId,
        },
      },
      update: {
        value,
      },
      create: {
        issueId,
        customFieldId,
        value,
      },
    });

    return fieldValue;
  }

  /**
   * Retrieves all custom fields and their saved values for an issue.
   */
  async getIssueCustomFields(issueId: string, orgId: string, userId: string) {
    await this.verifyOrgAccess(orgId, userId);

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });

    if (!issue) {
      const error: any = new Error("Issue not found");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const fields = await prisma.customField.findMany({
      where: {
        organizationId: orgId,
        OR: [{ projectId: issue.projectId }, { projectId: null }],
      },
      include: {
        values: {
          where: { issueId },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return fields.map((f) => ({
      id: f.id,
      name: f.name,
      fieldKey: f.fieldKey,
      type: f.type,
      description: f.description,
      options: f.options ? JSON.parse(f.options) : [],
      isRequired: f.isRequired,
      value: f.values[0]?.value ?? f.defaultValue ?? null,
    }));
  }

  /**
   * Lists all custom fields defined for an organization or project.
   */
  async listCustomFields(orgId: string, userId: string, projectId?: string) {
    await this.verifyOrgAccess(orgId, userId);

    const fields = await prisma.customField.findMany({
      where: {
        organizationId: orgId,
        ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return fields.map((f) => ({
      ...f,
      options: f.options ? JSON.parse(f.options) : [],
    }));
  }
}

export const customFieldService = new CustomFieldService();
