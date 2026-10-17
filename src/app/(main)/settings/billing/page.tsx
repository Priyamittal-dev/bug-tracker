import { getBillingOverview } from "@/app/actions/billing";
import { BillingConsole } from "@/components/billing/billing-console";
import { canReadBilling } from "@/lib/rbac";
import { getTenantContext } from "@/lib/tenant";
import { ShieldAlert } from "lucide-react";
import { getStripeEnvironment } from "@/lib/billing/stripe-provider";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const tenant = await getTenantContext();
  if (!tenant || !canReadBilling(tenant.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <h2 className="text-base font-bold">Billing is restricted</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Only organization owners and admins can view payment methods,
          invoices, and subscription contracts.
        </p>
      </div>
    );
  }

  const overview = await getBillingOverview();
  if (!overview) {
    return (
      <p className="text-sm text-muted-foreground">
        Unable to load billing for this workspace.
      </p>
    );
  }
  const stripeEnvironment = getStripeEnvironment();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground">
          Billing & payments
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Subscription, payment methods, tax profiles, and invoices for{" "}
          {overview.organization.name}.
        </p>
      </div>
      <BillingConsole
        overview={overview}
        stripeMode={stripeEnvironment !== "local"}
        stripeEnvironment={stripeEnvironment}
        hasStripeCustomer={Boolean(overview.account.stripeCustomerId)}
      />
    </div>
  );
}
