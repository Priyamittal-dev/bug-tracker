"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { automationService } from "@/services/automation.service";
import { CreateAutomationRuleInput } from "@/lib/validations/automation";
import prisma from "@/lib/prisma";

export async function listAutomationRulesAction(projectId?: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await automationService.listRules(
      tenant.organizationId,
      tenant.userId,
      projectId,
    );
  } catch (error) {
    console.error("Failed to list automation rules:", error);
    return [];
  }
}

export async function createAutomationRuleAction(
  input: CreateAutomationRuleInput,
  projectId?: string,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await automationService.createRule(
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

export async function toggleAutomationRuleAction(
  ruleId: string,
  isActive: boolean,
) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  return await prisma.automationRule.update({
    where: { id: ruleId, organizationId: tenant.organizationId },
    data: { isActive },
  });
}

export async function deleteAutomationRuleAction(ruleId: string) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  return await automationService.deleteRule(
    ruleId,
    tenant.organizationId,
    tenant.userId,
  );
}
