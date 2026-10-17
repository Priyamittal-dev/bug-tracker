import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — BugTracker Enterprise SaaS",
  description: "Enterprise service level agreements, acceptable use, and SaaS terms of service.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-6 sm:px-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/login"
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
        >
          ← Back to BugTracker
        </Link>
      </div>

      <header className="border-b border-border pb-6 mb-8">
        <div className="inline-block px-2.5 py-1 text-xs font-mono font-semibold rounded bg-primary/10 text-primary mb-3">
          Master SaaS Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="text-xs text-muted-foreground mt-2">
          Effective: October 17, 2026 · Enterprise Defect & Agile Lifecycle Management
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or operating the BugTracker platform, creating an Organization, or enrolling squad members, you agree to be bound by these Master Terms of Service and all related operational policies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Multi-Tenant Workspaces & RBAC Responsibilities</h2>
          <p>
            Organization Owners are responsible for the management of roles (`ORGANIZATION_ADMIN`, `DEVELOPER`, `QA_ENGINEER`, `VIEWER`), invitations, and squad access rights. You agree to safeguard administrative credentials and report any suspicious unauthorized authentication activity immediately.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Acceptable Use Policy</h2>
          <p>
            You agree not to use the BugTracker infrastructure to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1 mt-2">
            <li>Inject malicious payloads, exploits, or unapproved automated scraping scripts into issue logs.</li>
            <li>Bypass or attempt to circumvent tenant authorization boundaries or RBAC rules.</li>
            <li>Exceed designated API rate limits or launch volumetric denial-of-service attacks.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Service Availability & Uptime</h2>
          <p>
            BugTracker strives to maintain a 99.9% uptime target for all enterprise core APIs and defect workflows, excluding scheduled maintenance windows announced in advance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Subscriptions, Invoicing & Cancellations</h2>
          <p>
            Billing tiers (Free, Pro, Enterprise) are billed on a recurring monthly or annual cadence processed through Stripe. Subscriptions can be upgraded, downgraded, or canceled at any time from Organization Settings.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Contact Information</h2>
          <p>
            Legal questions regarding these Terms should be sent to{" "}
            <a href="mailto:gargr0109@gmail.com" className="text-primary hover:underline">
              gargr0109@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
