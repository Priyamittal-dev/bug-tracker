"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatUsd,
  quotePlan,
  type BillingInterval,
  type PlanDefinition,
  type PlanKey,
} from "@/lib/billing/plans";

export function PricingCalculator({
  isLoggedIn,
  catalog,
}: {
  isLoggedIn: boolean;
  catalog: Record<PlanKey, PlanDefinition>;
}) {
  const [interval, setInterval] = useState<BillingInterval>("MONTHLY");
  const [seats, setSeats] = useState<number>(10);

  const planList = Object.values(catalog);

  return (
    <div className="space-y-8">
      {/* Interactive Controls Bar */}
      <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-xs flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        {/* Seats Slider */}
        <div className="w-full md:w-1/2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              Team Size Calculator:
            </span>
            <span className="font-mono font-black text-primary text-sm">
              {seats} seat{seats > 1 ? "s" : ""}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>1 seat</span>
            <span>25 seats</span>
            <span>50 seats</span>
            <span>100+ seats</span>
          </div>
        </div>

        {/* Interval Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Billing:</span>
          <div className="flex rounded-xl border border-border overflow-hidden p-0.5 bg-muted/40 text-xs font-bold">
            <button
              type="button"
              onClick={() => setInterval("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                interval === "MONTHLY"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("YEARLY")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                interval === "YEARLY"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="text-[10px] bg-emerald-500 text-white dark:text-emerald-950 px-1.5 py-0.2 rounded font-black">
                -17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 items-stretch">
        {planList.map((plan) => {
          const isTeam = plan.key === "TEAM";
          const quote = quotePlan(plan.key, interval, seats);
          const price = quote.subtotalCents;

          return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                isTeam
                  ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-2 ring-primary/40 -translate-y-1"
                  : "border-border bg-card hover:border-border/80 shadow-xs"
              }`}
            >
              {isTeam && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.tagline}
                  </p>
                </div>

                <div className="space-y-1 border-y border-border/60 py-3">
                  <div className="text-3xl font-black text-foreground tracking-tight">
                    {formatUsd(price)}
                    <span className="text-xs font-semibold text-muted-foreground">
                      /{interval === "YEARLY" ? "yr" : "mo"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {plan.includedSeats} included seats
                    {quote.extraSeats > 0 &&
                      ` · +${quote.extraSeats} extra (${formatUsd(quote.extraSeatCents)})`}
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href={
                    isLoggedIn
                      ? "/settings/billing"
                      : `/register?plan=${plan.key.toLowerCase()}`
                  }
                  className="w-full block"
                >
                  <Button
                    size="default"
                    variant={isTeam ? "default" : "outline"}
                    className="w-full font-bold text-xs gap-1.5"
                  >
                    {isLoggedIn ? "Select in Workspace" : "Get Started"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
