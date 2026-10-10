import { PLAN_CATALOG } from "@/lib/billing/plans";
import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  return apiSuccess({
    plans: Object.values(PLAN_CATALOG),
    currency: "USD",
  });
}
