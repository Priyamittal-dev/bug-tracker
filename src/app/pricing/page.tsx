import Link from "next/link";
import { auth } from "@/auth";
import {
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  HelpCircle,
  CreditCard,
  Building2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_CATALOG, formatUsd, type PlanKey } from "@/lib/billing/plans";
import { PricingCalculator } from "@/components/billing/pricing-calculator";

export const metadata = {
  title: "Pricing & Plans | BugTracker",
  description:
    "Predictable, seat-based SaaS pricing for modern engineering teams. Free tier available with instant sandbox testing.",
};

export default async function PricingPage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Navigation */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-black text-sm shadow-md shadow-primary/20">
              BT
            </div>
            <span className="text-base font-black tracking-tight">BugTracker</span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-xs font-bold">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/settings/billing">
                  <Button size="sm" className="text-xs font-bold gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Manage Billing
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-xs font-bold">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="text-xs font-bold gap-1">
                    Get Started Free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Transparent, Predictable Engineering SaaS Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Scale your defect tracking with zero surprises
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            From open-source prototypes to multi-team enterprises requiring SLAs
            and compliance. Start free today with instant gateway sandbox testing.
          </p>
        </div>

        {/* Interactive Pricing Calculator & Tier Cards */}
        <PricingCalculator isLoggedIn={isLoggedIn} catalog={PLAN_CATALOG} />

        {/* Detailed Feature Comparison Grid */}
        <section className="space-y-6 pt-8 border-t border-border/60">
          <div className="text-center space-y-1.5 max-w-xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              Feature Matrix & Platform Limits
            </h2>
            <p className="text-xs text-muted-foreground">
              Compare capability tiers across defect management, workflows,
              automations, and governance.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                  <th className="text-left font-bold p-4 w-1/3">Feature / Capability</th>
                  <th className="text-center font-bold p-4 w-1/6">Free</th>
                  <th className="text-center font-bold p-4 w-1/6">Team</th>
                  <th className="text-center font-bold p-4 w-1/6">Business</th>
                  <th className="text-center font-bold p-4 w-1/6">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <MatrixRow feature="Included Seats" free="5" team="10" business="25" enterprise="50" />
                <MatrixRow feature="Maximum Projects" free="3" team="Unlimited" business="Unlimited" enterprise="Unlimited" />
                <MatrixRow feature="Agile Sprints & Releases" free={false} team={true} business={true} enterprise={true} />
                <MatrixRow feature="Automation Rules" free="2" team="20" business="Unlimited" enterprise="Unlimited" />
                <MatrixRow feature="SLA Resolution Policies" free="None" team="3" business="Unlimited" enterprise="Unlimited" />
                <MatrixRow feature="Audit Log Retention" free="14 Days" team="90 Days" business="365 Days" enterprise="Unlimited" />
                <MatrixRow feature="SSO & SAML Integration" free={false} team={false} business={true} enterprise={true} />
                <MatrixRow feature="Invoice & Purchase Orders (PO)" free={false} team={false} business={true} enterprise={true} />
                <MatrixRow feature="Dedicated Customer Success Mgr" free={false} team={false} business={false} enterprise={true} />
                <MatrixRow feature="Support Tier" free="Community" team="Email (24h)" business="Priority (4h)" enterprise="Dedicated 24/7" />
              </tbody>
            </table>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="space-y-6 pt-8 border-t border-border/60 max-w-4xl mx-auto">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              Billing Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              Answers regarding security, tokenization, test cards, and payment options.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FaqCard
              q="Can I test payments without using real cards?"
              a="Yes! BugTracker operates in Payment Gateway Sandbox mode. We provide 1-click test cards (Visa 4242 for success, 4000…0002 for declines) so you can thoroughly test the entire payment experience safely."
            />
            <FaqCard
              q="Are credit card numbers stored on your servers?"
              a="Never. All payment methods are tokenized with PCI-DSS Level 1 compliance. We only retain the last 4 digits, brand, and secure cryptographic fingerprint."
            />
            <FaqCard
              q="Can I pay via ACH, SEPA, or Invoice PO?"
              a="Yes. On Business and Enterprise plans, you can add bank debit instruments or corporate Purchase Orders with Net-30 invoicing terms."
            />
            <FaqCard
              q="What happens if I cancel my subscription?"
              a="You can choose to cancel at the end of the billing period (retaining access until your cycle concludes) or immediately downgrade to the Free tier."
            />
          </div>
        </section>

        {/* Bottom Banner */}
        <div className="rounded-2xl p-8 sm:p-12 border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/5 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Start tracking bugs and managing releases today
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Get your team up and running in under 2 minutes. Upgrade or downgrade
            anytime with prorated seat calculations.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href={isLoggedIn ? "/settings/billing" : "/register"}>
              <Button size="lg" className="font-bold gap-2">
                {isLoggedIn ? "Manage Billing & Upgrade" : "Create Free Workspace"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} BugTracker Platform. Built for engineering teams.</p>
      </footer>
    </div>
  );
}

function MatrixRow({
  feature,
  free,
  team,
  business,
  enterprise,
}: {
  feature: string;
  free: string | boolean;
  team: string | boolean;
  business: string | boolean;
  enterprise: string | boolean;
}) {
  const renderVal = (v: string | boolean) => {
    if (typeof v === "boolean") {
      return v ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
      );
    }
    return <span className="font-medium text-foreground">{v}</span>;
  };

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="p-3.5 font-medium text-foreground">{feature}</td>
      <td className="p-3.5 text-center">{renderVal(free)}</td>
      <td className="p-3.5 text-center">{renderVal(team)}</td>
      <td className="p-3.5 text-center">{renderVal(business)}</td>
      <td className="p-3.5 text-center">{renderVal(enterprise)}</td>
    </tr>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
        {q}
      </h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}
