"use client";

import { useState } from "react";
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Building,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/billing/plans";

export interface InvoiceModalData {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  amountPaidCents: number;
  periodStart: string | Date;
  periodEnd: string | Date;
  dueDate: string | Date;
  paidAt?: string | Date | null;
  memo?: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmountCents: number;
  }>;
  paymentMethod?: {
    type: string;
    brand?: string | null;
    last4: string;
  } | null;
}

export function InvoiceModal({
  invoice,
  companyName,
  billingEmail,
  taxId,
  country,
  isOpen,
  onClose,
  onPay,
  isPaying = false,
}: {
  invoice: InvoiceModalData | null;
  companyName?: string | null;
  billingEmail?: string;
  taxId?: string | null;
  country?: string;
  isOpen: boolean;
  onClose: () => void;
  onPay?: (invoiceId: string) => void;
  isPaying?: boolean;
}) {
  if (!isOpen || !invoice) return null;

  const isPaid = invoice.status === "PAID";
  const isVoid = invoice.status === "VOID";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in-0 duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              Invoice #{invoice.number}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0">
          {/* Top Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground font-black text-sm flex items-center justify-center">
                  BT
                </div>
                <span className="text-lg font-black tracking-tight text-foreground">
                  BugTracker Cloud
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Enterprise Issue Tracker & Defect Management Platform
              </p>
              <p className="text-[11px] text-muted-foreground">
                billing@bugtracker.app • Tax ID: US-EIN-9842103
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="flex sm:justify-end items-center gap-2">
                <h1 className="text-xl font-black text-foreground">INVOICE</h1>
                <Badge
                  variant={
                    isPaid ? "secondary" : isVoid ? "destructive" : "outline"
                  }
                  className={`text-[11px] uppercase ${
                    isPaid
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : ""
                  }`}
                >
                  {isPaid ? "PAID" : invoice.status}
                </Badge>
              </div>
              <p className="text-xs font-mono font-bold text-foreground">
                {invoice.number}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Issue Date: {new Date(invoice.periodStart).toLocaleDateString()}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Bill-To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Billed To
              </span>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {companyName || "Organization Workspace"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {billingEmail || "billing@workspace.local"}
              </p>
              {taxId && (
                <p className="text-[11px] text-muted-foreground">
                  Tax / VAT ID: {taxId}
                </p>
              )}
              {country && (
                <p className="text-[11px] text-muted-foreground">
                  Country: {country}
                </p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Billing Cycle
              </span>
              <p className="text-xs text-foreground">
                {new Date(invoice.periodStart).toLocaleDateString()} –{" "}
                {new Date(invoice.periodEnd).toLocaleDateString()}
              </p>
              {invoice.paymentMethod && (
                <p className="text-[11px] text-muted-foreground flex sm:justify-end items-center gap-1.5 mt-1">
                  <CreditCard className="h-3 w-3" />
                  {invoice.paymentMethod.brand?.toUpperCase() ||
                    invoice.paymentMethod.type}{" "}
                  •••• {invoice.paymentMethod.last4}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-border/80 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold p-3">Description</th>
                  <th className="text-center font-semibold p-3 w-16">Qty</th>
                  <th className="text-right font-semibold p-3 w-28">Unit Price</th>
                  <th className="text-right font-semibold p-3 w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium text-foreground">
                      {item.description}
                    </td>
                    <td className="p-3 text-center text-muted-foreground font-mono">
                      {item.quantity}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatUsd(item.unitAmountCents)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      {formatUsd(item.quantity * item.unitAmountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1 text-xs text-muted-foreground max-w-xs">
              <p className="font-semibold text-foreground">Memo & Notes:</p>
              <p className="text-[11px]">
                {invoice.memo || "All payments processed in gateway sandbox."}
              </p>
              {isPaid && invoice.paidAt && (
                <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Paid on {new Date(invoice.paidAt).toLocaleDateString()}
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">
                  {formatUsd(invoice.subtotalCents)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (Est.):</span>
                <span className="font-mono font-medium">
                  {formatUsd(invoice.taxCents)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-black text-foreground">
                <span>Total:</span>
                <span className="font-mono">{formatUsd(invoice.totalCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Amount Paid:</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {formatUsd(invoice.amountPaidCents)}
                </span>
              </div>
              {!isPaid && !isVoid && (
                <div className="flex justify-between font-bold text-destructive border-t border-border/60 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">
                    {formatUsd(invoice.totalCents - invoice.amountPaidCents)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Security Watermark */}
          <div className="pt-4 border-t border-dashed border-border/80 text-[10px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Verified PCI-DSS Level 1 Sandbox Transaction Receipt
            </span>
            <span>Thank you for using BugTracker!</span>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {!isPaid && !isVoid && onPay && (
            <Button
              size="sm"
              disabled={isPaying}
              onClick={() => onPay(invoice.id)}
            >
              {isPaying ? "Processing..." : `Pay ${formatUsd(invoice.totalCents)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
