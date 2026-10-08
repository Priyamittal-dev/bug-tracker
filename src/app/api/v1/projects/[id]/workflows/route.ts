import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { workflowService } from "@/services/workflow.service";
import { createWorkflowSchema } from "@/lib/validations/workflow";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: projectId } = await params;
    const workflows = await workflowService.listWorkflows(
      tenant.organizationId,
      tenant.userId,
      projectId,
    );

    return apiSuccess(workflows);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to list workflows",
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
    const parsed = createWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const workflow = await workflowService.createWorkflow(
      tenant.organizationId,
      tenant.userId,
      parsed.data,
      projectId,
    );

    return apiSuccess(workflow, 201);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to create workflow",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}
