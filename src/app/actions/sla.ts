"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { slaService } from "@/services/sla.service";
import { CreateSlaPolicyInput } from "@/lib/validations/sla";

export async function getSlaMetricsAction() {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await slaService.getSlaMetrics(tenant.organizationId, tenant.userId);
  } catch (error) {
    console.error("Failed to get SLA metrics:", error);
    return null;
  }
}

export async function createSlaPolicyAction(
  input: CreateSlaPolicyInput,
  projectId?: string,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await slaService.createPolicy(
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

export async function seedDefaultSlaPolicyAction(projectId?: string) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  return await slaService.seedDefaultPolicy(
    tenant.organizationId,
    tenant.userId,
    projectId,
  );
}
