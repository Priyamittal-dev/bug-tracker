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
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Sparkles,
  Sliders,
  DollarSign,
  Info,
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
  cancelSubscriptionAction,
  changePlanAction,
  payInvoiceAction,
  reactivateSubscriptionAction,
  refundTransactionAction,
  removePaymentMethodAction,
  setDefaultPaymentMethodAction,
  updateBillingProfileAction,
  voidInvoiceAction,
} from "@/app/actions/billing";
import { formatUsd, quotePlan, type PlanKey } from "@/lib/billing/plans";
import {
  SANDBOX_TEST_CARDS,
  type SandboxTestCard,
} from "@/lib/billing/sandbox-gateway";
import { InvoiceModal, type InvoiceModalData } from "./invoice-modal";

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
  const [activeTab, setActiveTab] = useState<
    "overview" | "methods" | "transactions" | "invoices" | "profile"
  >("overview");
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">(
    (overview.subscription?.billingInterval as "MONTHLY" | "YEARLY") ||
      "MONTHLY",
  );
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceModalData | null>(null);
  const [txFilter, setTxFilter] = useState<string>("ALL");
  const [customSeats, setCustomSeats] = useState<number>(
    overview.subscription?.seatQuantity || overview.usage.seatsUsed || 5,
  );

  const currentPlan = overview.organization.plan as PlanKey;
  const isCanceled = overview.subscription?.cancelAtPeriodEnd || false;

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) {
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

  const filteredTransactions = useMemo(() => {
    if (txFilter === "ALL") return overview.transactions;
    return overview.transactions.filter((t) => t.status === txFilter);
  }, [overview.transactions, txFilter]);

  return (
    <div className="space-y-6">
      {/* Sandbox Test Mode Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              Payment Gateway Sandbox Active
              <Badge
                variant="outline"
                className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px]"
              >
                TEST MODE
              </Badge>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/80 mt-0.5">
              Simulated PCI-DSS tokenized payments. Use test cards (e.g. 4242…4242
              for success, 4000…0002 to test decline).
            </p>
          </div>
        </div>
        <AddPaymentMethodDialog
          pending={pending}
          onAdd={(payload) =>
            run(() => addPaymentMethodAction(payload), "Payment method saved")
          }
        />
      </div>

      {(message || error) && (
        <div
          className={`text-xs font-semibold rounded-lg px-4 py-2.5 flex items-center justify-between ${
            error
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          }`}
        >
          <span>{error || message}</span>
          <button
            onClick={() => {
              setError(null);
              setMessage(null);
            }}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UsageCard
          label="Active Subscription"
          value={overview.organization.plan}
          hint={
            isCanceled
              ? "Cancels at period end"
              : `${overview.subscription?.status || "ACTIVE"} · ${interval}`
          }
          highlight={overview.organization.plan !== "FREE"}
        />
        <UsageCard
          label="Workspace Seats"
          value={`${overview.usage.seatsUsed} / ${overview.usage.seatsPurchased}`}
          hint={`${overview.usage.seatsIncluded} included in tier`}
        />
        <UsageCard
          label="Next Renewal Estimate"
          value={formatUsd(overview.quote.subtotalCents)}
          hint={
            overview.subscription?.currentPeriodEnd
              ? `Period ends ${new Date(overview.subscription.currentPeriodEnd).toLocaleDateString()}`
              : "No active cycle"
          }
        />
        <UsageCard
          label="Total Settled"
          value={formatUsd(overview.stats.totalPaidCents)}
          hint={`${overview.stats.openInvoicesCount} open invoice(s)`}
        />
      </section>

      {/* Tabs Bar */}
      <div className="flex border-b border-border/80 gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Plans & Subscription
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("methods")}
          className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "methods"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Payment Instruments ({overview.paymentMethods.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "transactions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Payment History ({overview.transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "invoices"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          Invoices & Ledger ({overview.invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Billing Profile & Tax
        </button>
      </div>

      {/* TAB 1: Subscription & Plans */}
      {activeTab === "overview" && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Subscription Plan Selection
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seat-based SaaS billing with prorated upgrades and annual prepayment
                discount.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Seats:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={customSeats}
                  onChange={(e) =>
                    setCustomSeats(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-16 h-7 rounded border border-input bg-background px-2 text-xs font-mono font-bold"
                />
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-bold">
                <button
                  className={`px-3 py-1.5 ${
                    interval === "MONTHLY"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                  onClick={() => setInterval("MONTHLY")}
                  type="button"
                >
                  Monthly
                </button>
                <button
                  className={`px-3 py-1.5 ${
                    interval === "YEARLY"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                  onClick={() => setInterval("YEARLY")}
                  type="button"
                >
                  Yearly (-17%)
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overview.catalog.map((plan) => {
              const active = plan.key === currentPlan;
              const quote = quotePlan(plan.key, interval, customSeats);
              const price = quote.subtotalCents;

              return (
                <div
                  key={plan.key}
                  className={`rounded-2xl border p-5 space-y-4 flex flex-col justify-between transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-black text-foreground">
                          {plan.name}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {plan.tagline}
                        </p>
                      </div>
                      {active && (
                        <Badge className="bg-primary text-primary-foreground">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-black text-foreground">
                      {formatUsd(price)}
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        /{interval === "YEARLY" ? "yr" : "mo"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                      Includes {plan.includedSeats} seats
                      {quote.extraSeats > 0 &&
                        ` · +${quote.extraSeats} add-on seats (${formatUsd(quote.extraSeatCents)})`}
                    </div>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      size="sm"
                      variant={active ? "outline" : "default"}
                      disabled={pending || active}
                      className="w-full font-bold"
                      onClick={() =>
                        run(
                          () =>
                            changePlanAction({
                              planKey: plan.key,
                              billingInterval: interval,
                              seatQuantity: customSeats,
                            }),
                          `Workspace moved to ${plan.name}`,
                        )
                      }
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : null}
                      {active
                        ? "Active Plan"
                        : plan.key === "FREE"
                          ? "Downgrade to Free"
                          : `Upgrade to ${plan.name}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cancellation and Reactivation controls */}
          {currentPlan !== "FREE" && (
            <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Subscription Status & Renewal
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isCanceled
                    ? `This workspace is scheduled to cancel on ${
                        overview.subscription?.currentPeriodEnd
                          ? new Date(
                              overview.subscription.currentPeriodEnd,
                            ).toLocaleDateString()
                          : "end of period"
                      }.`
                    : "Your subscription automatically renews at the start of each billing period."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCanceled ? (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => reactivateSubscriptionAction(),
                        "Subscription renewed and reactivated",
                      )
                    }
                  >
                    Reactivate Subscription
                  </Button>
                ) : (
                  <CancelSubscriptionDialog
                    pending={pending}
                    onCancel={(atPeriodEnd, reason) =>
                      run(
                        () => cancelSubscriptionAction(atPeriodEnd, reason),
                        "Subscription cancellation updated",
                      )
                    }
                  />
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Payment Methods */}
      {activeTab === "methods" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Payment Instruments
              </h3>
              <p className="text-xs text-muted-foreground">
                Cards and bank accounts are tokenized with PCI-DSS safety. Raw PAN
                and CVC are never stored.
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
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No payment instruments on file. Add a sandbox card, ACH, or SEPA
                account to activate paid features.
              </div>
            )}
            {overview.paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3.5 bg-card hover:border-border/80 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {pm.type === "CARD" ? (
                      <CreditCard className="h-5 w-5 text-primary" />
                    ) : pm.type === "INVOICE" ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : (
                      <Landmark className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      {methodLabel(pm.type, pm.brand)} •••• {pm.last4}
                      {pm.isDefault && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {pm.holderName}
                      {pm.expMonth && pm.expYear
                        ? ` · Exp ${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}`
                        : ""}
                      {pm.bankName ? ` · ${pm.bankName}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                      Make Default
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
      )}

      {/* TAB 3: Payment History & Transaction Status Tracking */}
      {activeTab === "transactions" && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Payment History & Transaction Status Tracking
              </h3>
              <p className="text-xs text-muted-foreground">
                Live sandbox transaction ledger with gateway authorization IDs and
                instant refund controls.
              </p>
            </div>
            {/* Filter buttons */}
            <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-bold">
              {["ALL", "SUCCEEDED", "FAILED", "REFUNDED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTxFilter(st)}
                  className={`px-2.5 py-1.5 transition-colors ${
                    txFilter === st
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold p-3">Date</th>
                  <th className="text-left font-semibold p-3">Gateway ID</th>
                  <th className="text-left font-semibold p-3">Type</th>
                  <th className="text-left font-semibold p-3">Status</th>
                  <th className="text-left font-semibold p-3">Instrument</th>
                  <th className="text-right font-semibold p-3">Amount</th>
                  <th className="text-right font-semibold p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No transactions recorded for filter: {txFilter}
                    </td>
                  </tr>
                )}
                {filteredTransactions.map((tx) => {
                  const isSuccess = tx.status === "SUCCEEDED";
                  const isFailed = tx.status === "FAILED";
                  const isRefunded = tx.status === "REFUNDED";

                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()} ·{" "}
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground max-w-[150px] truncate">
                        <span title={tx.gatewayTransactionId}>
                          {tx.gatewayTransactionId}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-[11px] text-muted-foreground">
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isFailed
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="h-3 w-3" />}
                          {isFailed && <XCircle className="h-3 w-3" />}
                          {isRefunded && <RotateCcw className="h-3 w-3" />}
                          {tx.status}
                        </span>
                        {tx.failureReason && (
                          <p className="text-[10px] text-destructive mt-0.5 max-w-xs truncate" title={tx.failureReason}>
                            {tx.failureReason}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {tx.paymentMethod ? (
                          <span>
                            {tx.paymentMethod.brand?.toUpperCase() ||
                              tx.paymentMethod.type}{" "}
                            •••• {tx.paymentMethod.last4}
                          </span>
                        ) : (
                          "Invoice Terms"
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {tx.type === "REFUND" ? "-" : ""}
                        {formatUsd(tx.amountCents)}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {isSuccess && tx.type === "CHARGE" && (
                          <RefundDialog
                            transactionId={tx.id}
                            maxAmountCents={
                              tx.amountCents - tx.refundedAmountCents
                            }
                            pending={pending}
                            onRefund={(amountCents, reason) =>
                              run(
                                () =>
                                  refundTransactionAction(
                                    tx.id,
                                    amountCents,
                                    reason,
                                  ),
                                "Refund processed in sandbox gateway",
                              )
                            }
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: Invoices & Receipts */}
      {activeTab === "invoices" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Invoices & Formal Receipts
              </h3>
              <p className="text-xs text-muted-foreground">
                Click any invoice to view, print, or download a PCI-compliant PDF
                receipt.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold p-3">Invoice Number</th>
                  <th className="text-left font-semibold p-3">Billing Cycle</th>
                  <th className="text-left font-semibold p-3">Status</th>
                  <th className="text-right font-semibold p-3">Total</th>
                  <th className="text-right font-semibold p-3">Paid</th>
                  <th className="text-right font-semibold p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No invoices have been issued yet.
                    </td>
                  </tr>
                )}
                {overview.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-foreground">
                      {inv.number}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(inv.periodStart).toLocaleDateString()} –{" "}
                      {new Date(inv.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          inv.status === "PAID"
                            ? "secondary"
                            : inv.status === "VOID"
                              ? "destructive"
                              : "outline"
                        }
                        className={
                          inv.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : ""
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {formatUsd(inv.totalCents)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatUsd(inv.amountPaidCents)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedInvoice(inv as any)}
                      >
                        <Receipt className="h-3 w-3 mr-1" />
                        View / Print
                      </Button>
                      {inv.status !== "PAID" && inv.status !== "VOID" && (
                        <>
                          <Button
                            size="xs"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => payInvoiceAction(inv.id),
                                "Invoice settled via sandbox payment",
                              )
                            }
                          >
                            Pay now
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () =>
                                  voidInvoiceAction(
                                    inv.id,
                                    "Customer requested void",
                                  ),
                                "Invoice marked as void",
                              )
                            }
                          >
                            Void
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: Billing Profile & Legal Info */}
      {activeTab === "profile" && (
        <BillingProfileForm
          account={overview.account}
          pending={pending}
          onSave={(payload) =>
            run(
              () => updateBillingProfileAction(payload),
              "Billing profile saved",
            )
          }
        />
      )}

      {/* Printable Invoice Modal Component */}
      <InvoiceModal
        invoice={selectedInvoice}
        companyName={overview.account.companyName || overview.organization.name}
        billingEmail={overview.account.billingEmail}
        taxId={overview.account.taxId}
        country={overview.account.country}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        isPaying={pending}
        onPay={(invId) => {
          run(() => payInvoiceAction(invId), "Invoice paid successfully");
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
}

function UsageCard({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-black mt-1 text-foreground">{value}</div>
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
  const [cardHolder, setCardHolder] = useState("Ada Lovelace");
  const [cardPan, setCardPan] = useState("4242 4242 4242 4242");
  const [cardMonth, setCardMonth] = useState("12");
  const [cardYear, setCardYear] = useState("2029");
  const [cardCvc, setCardCvc] = useState("123");

  const tabs = useMemo(
    () =>
      [
        { id: "CARD" as const, label: "Credit Card", icon: CreditCard },
        { id: "ACH" as const, label: "ACH Bank", icon: Landmark },
        { id: "SEPA_DEBIT" as const, label: "SEPA Direct", icon: Wallet },
        { id: "INVOICE" as const, label: "Invoice PO", icon: FileText },
      ] as const,
    [],
  );

  function autofill(card: SandboxTestCard) {
    setCardPan(card.pan);
    setCardMonth(String(card.expMonth));
    setCardYear(String(card.expYear));
    setCardCvc(card.cvc);
  }

  function submit(formData: FormData) {
    const payload: Record<string, unknown> = { type, setDefault: true };
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }
    if (type === "CARD") {
      payload.expMonth = Number(cardMonth);
      payload.expYear = Number(cardYear);
      payload.pan = cardPan;
      payload.cvc = cardCvc;
      payload.holderName = cardHolder;
    }
    onAdd(payload);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-bold">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Payment Method
          </Button>
        }
      >
        Add Payment Method
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-black">
            Add Payment Instrument
          </DialogTitle>
        </DialogHeader>

        {/* Instrument Type Tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setType(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  type === tab.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sandbox Test Cards Toolbar */}
        {type === "CARD" && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Quick Sandbox Test Cards:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SANDBOX_TEST_CARDS.map((card) => (
                <button
                  key={card.last4}
                  type="button"
                  onClick={() => autofill(card)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${
                    card.expectedOutcome === "SUCCEEDED"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20"
                  }`}
                  title={`${card.description} (Expected: ${card.expectedOutcome})`}
                >
                  {card.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form action={submit} className="space-y-3.5">
          {type === "CARD" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="holderName" className="text-xs font-bold">
                  Cardholder Name
                </Label>
                <Input
                  id="holderName"
                  name="holderName"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pan" className="text-xs font-bold">
                  Card Number
                </Label>
                <Input
                  id="pan"
                  name="pan"
                  value={cardPan}
                  onChange={(e) => setCardPan(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="expMonth" className="text-xs font-bold">
                    Month
                  </Label>
                  <Input
                    id="expMonth"
                    name="expMonth"
                    value={cardMonth}
                    onChange={(e) => setCardMonth(e.target.value)}
                    placeholder="12"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expYear" className="text-xs font-bold">
                    Year
                  </Label>
                  <Input
                    id="expYear"
                    name="expYear"
                    value={cardYear}
                    onChange={(e) => setCardYear(e.target.value)}
                    placeholder="2029"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cvc" className="text-xs font-bold">
                    CVC
                  </Label>
                  <Input
                    id="cvc"
                    name="cvc"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    type="password"
                    required
                  />
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Raw card details are verified in memory and never stored in the
                database.
              </div>
            </>
          )}

          {type === "ACH" && (
            <>
              <Field name="holderName" label="Account Holder" />
              <Field name="bankName" label="Bank Name" placeholder="Chase Bank" />
              <Field
                name="routingNumber"
                label="ABA Routing Number"
                placeholder="021000021"
              />
              <Field
                name="accountNumber"
                label="Account Number"
                placeholder="000123456789"
              />
            </>
          )}

          {type === "SEPA_DEBIT" && (
            <>
              <Field name="holderName" label="Account Holder" />
              <Field
                name="iban"
                label="IBAN"
                placeholder="DE89 3704 0044 0532 0130 00"
              />
              <Field
                name="accountNumber"
                label="Account Number"
                placeholder="370400440532"
              />
              <Field
                name="bankName"
                label="Bank Name"
                placeholder="Deutsche Bank"
              />
            </>
          )}

          {type === "INVOICE" && (
            <>
              <Field name="holderName" label="Billing Contact" />
              <Field
                name="poNumber"
                label="Purchase Order / Contract #"
                placeholder="PO-2026-9041"
              />
              <p className="text-[11px] text-muted-foreground">
                Enterprise Net-30 invoice terms. Authorized contracts will be
                invoiced automatically.
              </p>
            </>
          )}

          <Button type="submit" className="w-full font-bold" disabled={pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : null}
            Tokenize & Save Method
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({
  transactionId,
  maxAmountCents,
  pending,
  onRefund,
}: {
  transactionId: string;
  maxAmountCents: number;
  pending: boolean;
  onRefund: (amountCents?: number, reason?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState((maxAmountCents / 100).toFixed(2));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(Number(amount) * 100);
    onRefund(amountCents, reason || undefined);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="xs" variant="outline" className="gap-1">
            <RotateCcw className="h-3 w-3" />
            Refund
          </Button>
        }
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Refund
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Refund Transaction
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Process a full or partial refund for transaction #{transactionId.slice(-8)}.
            Max refundable:{" "}
            <strong className="text-foreground">{formatUsd(maxAmountCents)}</strong>
          </p>
          <div className="space-y-1">
            <Label htmlFor="refundAmount" className="text-xs font-bold">
              Refund Amount ($)
            </Label>
            <Input
              id="refundAmount"
              type="number"
              step="0.01"
              min="0.50"
              max={(maxAmountCents / 100).toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="refundReason" className="text-xs font-bold">
              Reason
            </Label>
            <Input
              id="refundReason"
              placeholder="Customer requested refund / duplicate"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Processing..." : `Process Refund of $${amount}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelSubscriptionDialog({
  pending,
  onCancel,
}: {
  pending: boolean;
  onCancel: (atPeriodEnd: boolean, reason?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [atPeriodEnd, setAtPeriodEnd] = useState(true);
  const [reason, setReason] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onCancel(atPeriodEnd, reason || undefined);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="text-destructive font-semibold">
            Cancel Subscription
          </Button>
        }
      >
        Cancel Subscription
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive">
            Cancel Workspace Subscription
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Choose whether to keep access until your active billing cycle expires
            or cancel immediately.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                checked={atPeriodEnd}
                onChange={() => setAtPeriodEnd(true)}
              />
              Cancel at end of current period (Recommended)
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                checked={!atPeriodEnd}
                onChange={() => setAtPeriodEnd(false)}
              />
              Cancel immediately and downgrade to Free
            </label>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cancelReason" className="text-xs font-bold">
              Cancellation Reason (Optional)
            </Label>
            <Input
              id="cancelReason"
              placeholder="e.g. Project finished, switching tools"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={pending}
          >
            Confirm Cancellation
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
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">
          Legal Entity & Billing Profile
        </h3>
        <p className="text-xs text-muted-foreground">
          Tax IDs, address, and invoicing terms for accounting and compliance.
        </p>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-2 p-5 rounded-xl border border-border bg-card"
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
          label="Billing Email"
          defaultValue={account.billingEmail}
        />
        <Field
          name="companyName"
          label="Legal Company Name"
          defaultValue={account.companyName || ""}
          required={false}
        />
        <Field
          name="taxId"
          label="Tax / VAT ID"
          defaultValue={account.taxId || ""}
          required={false}
        />
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Tax ID Type</Label>
          <select
            name="taxIdType"
            defaultValue={account.taxIdType || ""}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs"
          >
            <option value="">None</option>
            <option value="EIN">EIN (US)</option>
            <option value="VAT">VAT (EU/UK)</option>
            <option value="GST">GST (Canada/Australia)</option>
            <option value="ABN">ABN (Australia)</option>
            <option value="GSTIN">GSTIN (India)</option>
          </select>
        </div>
        <Field
          name="addressLine1"
          label="Street Address"
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
          label="State / Region"
          defaultValue={account.region || ""}
          required={false}
        />
        <Field
          name="postalCode"
          label="Postal Code"
          defaultValue={account.postalCode || ""}
          required={false}
        />
        <Field name="country" label="Country Code" defaultValue={account.country} />
        <Field
          name="poNumber"
          label="Default Purchase Order"
          defaultValue={account.poNumber || ""}
          required={false}
        />
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Collection Method</Label>
          <select
            name="collectionMethod"
            defaultValue={account.collectionMethod}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs"
          >
            <option value="CHARGE_AUTOMATICALLY">
              Charge Automatically (Card / Direct Debit)
            </option>
            <option value="SEND_INVOICE">
              Send Invoice (Net Terms Accounts Payable)
            </option>
          </select>
        </div>
        <Field
          name="netTermsDays"
          label="Net Terms (Days)"
          defaultValue={String(account.netTermsDays)}
        />
        <div className="sm:col-span-2 pt-2">
          <Button type="submit" disabled={pending} className="font-bold">
            <Building2 className="h-3.5 w-3.5 mr-1" />
            Save Billing Profile
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
      <Label htmlFor={name} className="text-xs font-bold">
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
