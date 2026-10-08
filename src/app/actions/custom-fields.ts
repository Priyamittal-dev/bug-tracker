"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { customFieldService } from "@/services/custom-field.service";
import { CreateCustomFieldInput } from "@/lib/validations/custom-field";

export async function listCustomFieldsAction(projectId?: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await customFieldService.listCustomFields(
      tenant.organizationId,
      tenant.userId,
      projectId,
    );
  } catch (error) {
    console.error("Failed to list custom fields:", error);
    return [];
  }
}

export async function getIssueCustomFieldsAction(issueId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await customFieldService.getIssueCustomFields(
      issueId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get issue custom fields:", error);
    return [];
  }
}

export async function createCustomFieldAction(
  input: CreateCustomFieldInput,
  projectId?: string,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await customFieldService.createCustomField(
    tenant.organizationId,
    tenant.userId,
    input,
    projectId,
  );

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
  return result;
}

export async function setCustomFieldValueAction(
  issueId: string,
  fieldId: string,
  value: any,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await customFieldService.setFieldValue(
    issueId,
    fieldId,
    value,
    tenant.organizationId,
    tenant.userId,
  );

  revalidatePath(`/issues/${issueId}`);
  return result;
}
