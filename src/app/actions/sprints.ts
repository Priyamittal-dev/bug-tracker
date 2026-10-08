"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { sprintService } from "@/services/sprint.service";
import {
  CreateSprintInput,
  UpdateSprintInput,
  StartSprintInput,
  CompleteSprintInput,
} from "@/lib/validations/sprint";

export async function getSprints(projectId: string, status?: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await sprintService.listProjectSprints(
      projectId,
      tenant.organizationId,
      tenant.userId,
      status,
    );
  } catch (error) {
    console.error("Failed to get sprints:", error);
    return [];
  }
}

export async function getSprint(sprintId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await sprintService.getSprint(
      sprintId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get sprint:", error);
    return null;
  }
}

export async function createSprint(
  projectId: string,
  input: CreateSprintInput,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await sprintService.createSprint(
    projectId,
    tenant.organizationId,
    tenant.userId,
    input,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/sprints`);
  revalidatePath(`/projects/${projectId}/backlog`);
  return result;
}

export async function updateSprint(sprintId: string, input: UpdateSprintInput) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await sprintService.updateSprint(
    sprintId,
    tenant.organizationId,
    tenant.userId,
    input,
  );

  revalidatePath(`/projects/${result.projectId}`);
  revalidatePath(`/projects/${result.projectId}/sprints`);
  return result;
}

export async function startSprint(sprintId: string, input: StartSprintInput) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await sprintService.startSprint(
    sprintId,
    tenant.organizationId,
    tenant.userId,
    input,
  );

  revalidatePath(`/projects/${result.projectId}`);
  revalidatePath(`/projects/${result.projectId}/sprints`);
  revalidatePath(`/projects/${result.projectId}/board`);
  return result;
}

export async function completeSprint(
  sprintId: string,
  input: CompleteSprintInput,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await sprintService.completeSprint(
    sprintId,
    tenant.organizationId,
    tenant.userId,
    input,
  );

  revalidatePath(`/projects`);
  return result;
}

export async function addIssuesToSprint(sprintId: string, issueIds: string[]) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await sprintService.addIssuesToSprint(
    sprintId,
    tenant.organizationId,
    tenant.userId,
    issueIds,
  );

  revalidatePath(`/projects`);
  return result;
}

export async function removeIssuesFromSprint(
  sprintId: string,
  issueIds: string[],
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await sprintService.removeIssuesFromSprint(
    sprintId,
    tenant.organizationId,
    tenant.userId,
    issueIds,
  );

  revalidatePath(`/projects`);
  return result;
}

export async function getSprintBurndown(sprintId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await sprintService.getSprintBurndown(
      sprintId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get sprint burndown:", error);
    return null;
  }
}

export async function getProjectVelocity(projectId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await sprintService.getProjectVelocity(
      projectId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get project velocity:", error);
    return null;
  }
}
