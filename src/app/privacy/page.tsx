import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — BugTracker Enterprise SaaS",
  description: "Enterprise data protection, tenant isolation, SOC 2, GDPR, and CCPA compliance framework.",
};

export default function PrivacyPage() {
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
          SOC 2 / GDPR / CCPA Compliance
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground mt-2">
          Effective: October 17, 2026 · Enterprise Defect & Agile Lifecycle Management
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Architectural Multi-Tenant Isolation</h2>
          <p>
            BugTracker is engineered from the ground up with strict tenant data segregation. Organization boundaries are enforced at the database and application layers. Customer workspace data, defect tickets, sprint velocity, and squad telemetry are isolated using unique organization identifiers verified server-side via authenticated session tokens. No cross-tenant data leakage is permitted.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Information We Process</h2>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li><strong className="text-foreground">Authentication & User Identifiers:</strong> Work email, user full name, salted and bcrypt-hashed credentials, session tokens.</li>
            <li><strong className="text-foreground">Project & Engineering Metadata:</strong> Issues, defects, severity ratings, commit references, and audit logs.</li>
            <li><strong className="text-foreground">Billing Telemetry:</strong> Subscription status, tier entitlement, and Stripe customer IDs. No raw payment card data touches our application servers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Encryption & Defense-in-Depth</h2>
          <p>
            All network communication is protected via TLS 1.3 encryption with strict HTTP Strict Transport Security (HSTS). Application secrets and session cookies are signed with cryptographically secure salts (`HttpOnly`, `SameSite=Lax`, `Secure`). Sensitive credentials in the database are hashed with bcrypt (work factor 10+).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Data Subject Rights (GDPR & CCPA)</h2>
          <p>
            Users and enterprise administrators have guaranteed access to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1 mt-2">
            <li><strong>Right to Data Portability:</strong> Export defect catalogs and sprint history in structured JSON formats.</li>
            <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Complete cascading anonymization or deletion of workspace records upon organization termination.</li>
            <li><strong>Right to Rectification:</strong> Immediate correction of user credentials, names, and team assignments via self-serve settings.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Compliance & Security Inquiries</h2>
          <p>
            For enterprise compliance verifications, SOC 2 reports, or Data Protection Agreements (DPA), please submit a ticket to our compliance officer at{" "}
            <a href="mailto:gargr0109@gmail.com" className="text-primary hover:underline">
              gargr0109@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
