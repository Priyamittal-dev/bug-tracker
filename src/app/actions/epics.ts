"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { epicService } from "@/services/epic.service";
import { CreateEpicInput, UpdateEpicInput } from "@/lib/validations/epic";

export async function getEpics(projectId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await epicService.listProjectEpics(
      projectId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get epics:", error);
    return [];
  }
}

export async function getEpic(epicId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await epicService.getEpic(
      epicId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get epic:", error);
    return null;
  }
}

export async function createEpic(projectId: string, input: CreateEpicInput) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await epicService.createEpic(
    projectId,
    tenant.organizationId,
    tenant.userId,
    input,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/roadmap`);
  return result;
}

export async function updateEpic(epicId: string, input: UpdateEpicInput) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await epicService.updateEpic(
    epicId,
    tenant.organizationId,
    tenant.userId,
    input,
  );

  revalidatePath(`/projects/${result.projectId}`);
  revalidatePath(`/projects/${result.projectId}/roadmap`);
  return result;
}

export async function assignIssuesToEpic(epicId: string, issueIds: string[]) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await epicService.assignIssuesToEpic(
    epicId,
    tenant.organizationId,
    tenant.userId,
    issueIds,
  );

  revalidatePath(`/projects`);
  return result;
}

export async function removeIssuesFromEpic(epicId: string, issueIds: string[]) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await epicService.removeIssuesFromEpic(
    epicId,
    tenant.organizationId,
    tenant.userId,
    issueIds,
  );

  revalidatePath(`/projects`);
  return result;
}

export async function getProjectRoadmap(projectId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await epicService.getProjectRoadmap(
      projectId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (error) {
    console.error("Failed to get project roadmap:", error);
    return null;
  }
}
