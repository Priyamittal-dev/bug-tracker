"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { workflowService } from "@/services/workflow.service";
import {
  CreateWorkflowInput,
  CreateWorkflowStatusInput,
  CreateWorkflowTransitionInput,
} from "@/lib/validations/workflow";

export async function listWorkflowsAction(projectId?: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await workflowService.listWorkflows(
      tenant.organizationId,
      tenant.userId,
      projectId,
    );
  } catch (error) {
    console.error("Failed to list workflows:", error);
    return [];
  }
}

export async function getWorkflowAction(workflowId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await workflowService.getWorkflow(
      workflowId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get workflow:", error);
    return null;
  }
}

export async function createWorkflowAction(
  input: CreateWorkflowInput,
  projectId?: string,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await workflowService.createWorkflow(
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

export async function seedDefaultWorkflowAction(projectId?: string) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  return await workflowService.seedDefaultWorkflow(
    tenant.organizationId,
    tenant.userId,
    projectId,
  );
}

export async function addWorkflowStatusAction(
  workflowId: string,
  input: CreateWorkflowStatusInput,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  return await workflowService.addStatus(
    tenant.organizationId,
    tenant.userId,
    workflowId,
    input,
  );
}

export async function addWorkflowTransitionAction(
  workflowId: string,
  input: CreateWorkflowTransitionInput,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  return await workflowService.addTransition(
    tenant.organizationId,
    tenant.userId,
    workflowId,
    input,
  );
}

export async function validateWorkflowTransitionAction(
  projectId: string,
  fromStatusKey: string,
  toStatusKey: string,
  issueData?: { assigneeId?: string | null },
) {
  const tenant = await getTenantContext();
  if (!tenant) return { allowed: false, reason: "Unauthorized" };

  return await workflowService.validateTransition(
    tenant.organizationId,
    projectId,
    fromStatusKey,
    toStatusKey,
    tenant.userRole,
    issueData,
  );
}
