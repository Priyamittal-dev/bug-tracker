"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  Landmark,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addPaymentMethodAction,
  changePlanAction,
  payInvoiceAction,
  removePaymentMethodAction,
  setDefaultPaymentMethodAction,
  updateBillingProfileAction,
} from "@/app/actions/billing";
import { formatUsd, type PlanKey } from "@/lib/billing/plans";

type MethodType = "CARD" | "ACH" | "SEPA_DEBIT" | "INVOICE";

type Overview = Awaited<
  ReturnType<typeof import("@/services/billing.service").billingService.getOverview>
>;

function methodLabel(type: string, brand?: string | null) {
  if (type === "CARD") return (brand || "card").toUpperCase();
  if (type === "ACH") return "ACH / Bank";
  if (type === "SEPA_DEBIT") return "SEPA";
  if (type === "WIRE") return "Wire";
  return "Invoice / PO";
}

export function BillingConsole({ overview }: { overview: Overview }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">(
    (overview.subscription?.billingInterval as "MONTHLY" | "YEARLY") ||
      "MONTHLY",
  );

  const currentPlan = overview.organization.plan as PlanKey;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error || "Request failed");
        return;
      }
      setMessage(okMsg);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <div
          className={`text-xs font-semibold rounded-lg px-3 py-2 ${
            error
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <UsageCard
          label="Plan"
          value={overview.organization.plan}
          hint={`${overview.subscription?.status || "ACTIVE"} · ${interval}`}
        />
        <UsageCard
          label="Seats"
          value={`${overview.usage.seatsUsed} / ${overview.usage.seatsPurchased}`}
          hint={`${overview.usage.seatsIncluded} included`}
        />
        <UsageCard
          label="Next invoice"
          value={formatUsd(overview.quote.subtotalCents)}
          hint={
            overview.subscription?.currentPeriodEnd
              ? `Period ends ${new Date(overview.subscription.currentPeriodEnd).toLocaleDateString()}`
              : "No active cycle"
          }
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Subscription plans</h3>
            <p className="text-xs text-muted-foreground">
              Seat-based SaaS pricing with yearly prepay discount.
            </p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-bold">
            <button
              className={`px-3 py-1.5 ${interval === "MONTHLY" ? "bg-primary text-primary-foreground" : "bg-background"}`}
              onClick={() => setInterval("MONTHLY")}
              type="button"
            >
              Monthly
            </button>
            <button
              className={`px-3 py-1.5 ${interval === "YEARLY" ? "bg-primary text-primary-foreground" : "bg-background"}`}
              onClick={() => setInterval("YEARLY")}
              type="button"
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overview.catalog.map((plan) => {
            const active = plan.key === currentPlan;
            const price =
              interval === "YEARLY" ? plan.yearlyCents : plan.monthlyCents;
            return (
              <div
                key={plan.key}
                className={`rounded-xl border p-4 space-y-3 ${
                  active
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{plan.name}</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {plan.tagline}
                    </p>
                  </div>
                  {active && <Badge>Current</Badge>}
                </div>
                <div className="text-lg font-black">
                  {formatUsd(price)}
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    /{interval === "YEARLY" ? "yr" : "mo"}
                  </span>
                </div>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={active ? "outline" : "default"}
                  disabled={pending || active}
                  className="w-full"
                  onClick={() =>
                    run(
                      () =>
                        changePlanAction({
                          planKey: plan.key,
                          billingInterval: interval,
                          seatQuantity: Math.max(
                            overview.usage.seatsUsed,
                            plan.includedSeats,
                          ),
                        }),
                      `Workspace moved to ${plan.name}`,
                    )
                  }
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {active ? "Active" : plan.key === "FREE" ? "Downgrade" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Payment methods</h3>
            <p className="text-xs text-muted-foreground">
              Cards are tokenized. PAN and CVC are never stored.
            </p>
          </div>
          <AddPaymentMethodDialog
            pending={pending}
            onAdd={(payload) =>
              run(() => addPaymentMethodAction(payload), "Payment method saved")
            }
          />
        </div>
        <div className="space-y-2">
          {overview.paymentMethods.length === 0 && (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No instruments on file. Add a card, ACH, SEPA, or invoice PO to
              upgrade.
            </div>
          )}
          {overview.paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  {pm.type === "CARD" ? (
                    <CreditCard className="h-4 w-4" />
                  ) : pm.type === "INVOICE" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Landmark className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-2">
                    {methodLabel(pm.type, pm.brand)} •••• {pm.last4}
                    {pm.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {pm.holderName}
                    {pm.expMonth && pm.expYear
                      ? ` · Exp ${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}`
                      : ""}
                    {pm.bankName ? ` · ${pm.bankName}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!pm.isDefault && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => setDefaultPaymentMethodAction(pm.id),
                        "Default payment method updated",
                      )
                    }
                  >
                    <Star className="h-3 w-3" />
                    Default
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => removePaymentMethodAction(pm.id),
                      "Payment method removed",
                    )
                  }
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BillingProfileForm
        account={overview.account}
        pending={pending}
        onSave={(payload) =>
          run(() => updateBillingProfileAction(payload), "Billing profile saved")
        }
      />

      <section className="space-y-3">
        <h3 className="text-sm font-bold">Invoices</h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-semibold p-2.5">Number</th>
                <th className="text-left font-semibold p-2.5">Period</th>
                <th className="text-left font-semibold p-2.5">Status</th>
                <th className="text-right font-semibold p-2.5">Total</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody>
              {overview.invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No invoices yet.
                  </td>
                </tr>
              )}
              {overview.invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="p-2.5 font-mono font-bold">{inv.number}</td>
                  <td className="p-2.5 text-muted-foreground">
                    {new Date(inv.periodStart).toLocaleDateString()} –
                    {new Date(inv.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="p-2.5">
                    <Badge
                      variant={inv.status === "PAID" ? "secondary" : "outline"}
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="p-2.5 text-right font-semibold">
                    {formatUsd(inv.totalCents)}
                  </td>
                  <td className="p-2.5 text-right">
                    {inv.status !== "PAID" && (
                      <Button
                        size="xs"
                        disabled={pending}
                        onClick={() =>
                          run(() => payInvoiceAction(inv.id), "Invoice settled")
                        }
                      >
                        Pay now
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UsageCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-black mt-1">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
    </div>
  );
}

function AddPaymentMethodDialog({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (payload: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MethodType>("CARD");
  const tabs = useMemo(
    () =>
      [
        { id: "CARD" as const, label: "Card", icon: CreditCard },
        { id: "ACH" as const, label: "ACH", icon: Landmark },
        { id: "SEPA_DEBIT" as const, label: "SEPA", icon: Wallet },
        { id: "INVOICE" as const, label: "Invoice / PO", icon: FileText },
      ] as const,
    [],
  );

  function submit(formData: FormData) {
    const payload: Record<string, unknown> = { type, setDefault: true };
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }
    if (type === "CARD") {
      payload.expMonth = Number(formData.get("expMonth"));
      payload.expYear = Number(formData.get("expYear"));
    }
    onAdd(payload);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add method
          </Button>
        }
      >
        Add method
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add payment method</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1 mb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setType(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                  type === tab.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <form action={submit} className="space-y-3">
          {type === "CARD" && (
            <>
              <Field name="holderName" label="Name on card" placeholder="Ada Lovelace" />
              <Field
                name="pan"
                label="Card number"
                placeholder="4242 4242 4242 4242"
                autoComplete="off"
              />
              <div className="grid grid-cols-3 gap-2">
                <Field name="expMonth" label="Month" placeholder="12" />
                <Field name="expYear" label="Year" placeholder="2028" />
                <Field name="cvc" label="CVC" placeholder="123" type="password" />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Test cards: 4242…4242 (Visa), 5555…4444 (Mastercard)
              </p>
            </>
          )}
          {type === "ACH" && (
            <>
              <Field name="holderName" label="Account holder" />
              <Field name="bankName" label="Bank name" placeholder="Chase" />
              <Field name="routingNumber" label="Routing number" placeholder="021000021" />
              <Field name="accountNumber" label="Account number" />
            </>
          )}
          {type === "SEPA_DEBIT" && (
            <>
              <Field name="holderName" label="Account holder" />
              <Field name="iban" label="IBAN" placeholder="DE89 3704 0044 0532 0130 00" />
              <Field name="accountNumber" label="Account number" />
              <Field name="bankName" label="Bank name" placeholder="Deutsche Bank" />
            </>
          )}
          {type === "INVOICE" && (
            <>
              <Field name="holderName" label="Billing contact" />
              <Field name="poNumber" label="Purchase order" placeholder="PO-10492" />
              <p className="text-[11px] text-muted-foreground">
                Enterprise net-terms invoicing. Accounts payable will receive PDF
                invoices.
              </p>
            </>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            Save payment method
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BillingProfileForm({
  account,
  pending,
  onSave,
}: {
  account: Overview["account"];
  pending: boolean;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold">Billing profile</h3>
        <p className="text-xs text-muted-foreground">
          Legal entity, tax IDs, and collection method for finance.
        </p>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-2"
        action={(formData) => {
          onSave({
            billingEmail: formData.get("billingEmail"),
            companyName: formData.get("companyName"),
            taxId: formData.get("taxId") || null,
            taxIdType: formData.get("taxIdType") || null,
            addressLine1: formData.get("addressLine1"),
            city: formData.get("city"),
            region: formData.get("region"),
            postalCode: formData.get("postalCode"),
            country: formData.get("country"),
            collectionMethod: formData.get("collectionMethod"),
            poNumber: formData.get("poNumber") || null,
            netTermsDays: Number(formData.get("netTermsDays") || 30),
          });
        }}
      >
        <Field
          name="billingEmail"
          label="Billing email"
          defaultValue={account.billingEmail}
        />
        <Field
          name="companyName"
          label="Legal company name"
          defaultValue={account.companyName || ""}
          required={false}
        />
        <Field
          name="taxId"
          label="Tax ID"
          defaultValue={account.taxId || ""}
          required={false}
        />
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold">Tax ID type</Label>
          <select
            name="taxIdType"
            defaultValue={account.taxIdType || ""}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="">None</option>
            <option value="EIN">EIN</option>
            <option value="VAT">VAT</option>
            <option value="GST">GST</option>
            <option value="ABN">ABN</option>
            <option value="GSTIN">GSTIN</option>
          </select>
        </div>
        <Field
          name="addressLine1"
          label="Address"
          defaultValue={account.addressLine1 || ""}
          required={false}
        />
        <Field
          name="city"
          label="City"
          defaultValue={account.city || ""}
          required={false}
        />
        <Field
          name="region"
          label="State / region"
          defaultValue={account.region || ""}
          required={false}
        />
        <Field
          name="postalCode"
          label="Postal code"
          defaultValue={account.postalCode || ""}
          required={false}
        />
        <Field name="country" label="Country" defaultValue={account.country} />
        <Field
          name="poNumber"
          label="Default PO"
          defaultValue={account.poNumber || ""}
          required={false}
        />
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold">Collection</Label>
          <select
            name="collectionMethod"
            defaultValue={account.collectionMethod}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="CHARGE_AUTOMATICALLY">Charge automatically</option>
            <option value="SEND_INVOICE">Send invoice (net terms)</option>
          </select>
        </div>
        <Field
          name="netTermsDays"
          label="Net terms (days)"
          defaultValue={String(account.netTermsDays)}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            <Building2 className="h-3.5 w-3.5" />
            Save billing profile
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
  type = "text",
  autoComplete,
  required = true,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-[11px] font-bold">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
      />
    </div>
  );
}
