"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { ReleaseService } from "@/services/release.service";
import {
  CreateReleaseInput,
  UpdateReleaseInput,
} from "@/lib/validations/release";

export async function getReleasesAction(projectId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await ReleaseService.getReleases(tenant.organizationId, projectId);
  } catch (error) {
    console.error("Failed to get releases:", error);
    return [];
  }
}

export async function getReleaseAction(releaseId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await ReleaseService.getRelease(tenant.organizationId, releaseId);
  } catch (error) {
    console.error("Failed to get release:", error);
    return null;
  }
}

export async function createReleaseAction(
  projectId: string,
  input: CreateReleaseInput,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await ReleaseService.createRelease(
    tenant.userId,
    tenant.organizationId,
    projectId,
    input,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases`);
  return result;
}

export async function updateReleaseAction(
  releaseId: string,
  projectId: string,
  input: UpdateReleaseInput,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await ReleaseService.updateRelease(
    tenant.userId,
    tenant.organizationId,
    releaseId,
    input,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases`);
  revalidatePath(`/releases/${releaseId}`);
  return result;
}

export async function deleteReleaseAction(
  releaseId: string,
  projectId: string,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await ReleaseService.deleteRelease(
    tenant.userId,
    tenant.organizationId,
    releaseId,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases`);
  return result;
}

export async function addIssuesToReleaseAction(
  releaseId: string,
  projectId: string,
  issueIds: string[],
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await ReleaseService.addIssues(
    tenant.userId,
    tenant.organizationId,
    releaseId,
    issueIds,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases`);
  return result;
}

export async function removeIssuesFromReleaseAction(
  releaseId: string,
  projectId: string,
  issueIds: string[],
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await ReleaseService.removeIssues(
    tenant.userId,
    tenant.organizationId,
    releaseId,
    issueIds,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases`);
  return result;
}
