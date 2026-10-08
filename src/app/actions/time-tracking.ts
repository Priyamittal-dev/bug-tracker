"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { TimeTrackingService } from "@/services/time-tracking.service";
import { LogTimeInput } from "@/lib/validations/time-tracking";

export async function logTimeAction(issueId: string, input: LogTimeInput) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await TimeTrackingService.logTime(
    tenant.userId,
    tenant.organizationId,
    issueId,
    input,
  );

  revalidatePath(`/issues/${issueId}`);
  revalidatePath(`/dashboard`);
  return result;
}

export async function getTimeLogsAction(issueId: string) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return await TimeTrackingService.getTimeLogs(
      tenant.organizationId,
      issueId,
    );
  } catch (error) {
    console.error("Failed to get time logs:", error);
    return [];
  }
}

export async function deleteTimeLogAction(logId: string, issueId: string) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized");

  const result = await TimeTrackingService.deleteTimeLog(
    tenant.userId,
    tenant.organizationId,
    logId,
    tenant.userRole,
  );

  revalidatePath(`/issues/${issueId}`);
  revalidatePath(`/dashboard`);
  return result;
}

export async function getTimesheetReportAction(params?: {
  projectId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  try {
    return await TimeTrackingService.getTimesheetReport({
      organizationId: tenant.organizationId,
      projectId: params?.projectId,
      userId: params?.userId,
      startDate: params?.startDate ? new Date(params.startDate) : undefined,
      endDate: params?.endDate ? new Date(params.endDate) : undefined,
    });
  } catch (error) {
    console.error("Failed to get timesheet report:", error);
    return null;
  }
}
