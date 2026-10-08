import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { automationService } from "@/services/automation.service";
import { createAutomationRuleSchema } from "@/lib/validations/automation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: projectId } = await params;
    const rules = await automationService.listRules(
      tenant.organizationId,
      tenant.userId,
      projectId,
    );

    return apiSuccess(rules);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to list automation rules",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: projectId } = await params;
    const body = await req.json();
    const parsed = createAutomationRuleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const rule = await automationService.createRule(
      tenant.organizationId,
      tenant.userId,
      parsed.data,
      projectId,
    );

    return apiSuccess(rule, 201);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to create automation rule",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}
