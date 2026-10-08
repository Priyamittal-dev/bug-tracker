import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import {
  ShieldCheck,
  CheckCircle2,
  Server,
  Layers,
  Cpu,
  Sparkles,
} from "lucide-react";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Column: Enterprise Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-linear-to-br from-card via-background to-muted/40 border-r border-border relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2"></div>

        {/* Top Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">
              BUG<b>TRACKER</b>
            </span>
            <span className="ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary font-semibold">
              ORGANIZATION SETUP
            </span>
          </div>
        </div>

        {/* Center Content / Highlights */}
        <div className="relative z-10 space-y-8 my-auto max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/80 border border-border text-xs text-muted-foreground font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Instant Workspace Provisioning
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Launch Your Engineering Hub in{" "}
              <span className="text-primary">Under 60 Seconds</span>.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create an organization, invite your developers & QA engineers, and
              start tracking defects with custom workflows, SLAs, and automated
              regressions.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Automatic Owner & Role Assignment
                </p>
                <p className="text-xs text-muted-foreground">
                  Sign up as the organization Owner with full administrative
                  control and team delegation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Dedicated Engineering Squads
                </p>
                <p className="text-xs text-muted-foreground">
                  Default engineering squads initialized instantly for backlog
                  triage and defect resolution.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  24/7 Cloud CI/CD & Regression Engine
                </p>
                <p className="text-xs text-muted-foreground">
                  Continuous automated test validation protects your production
                  codebase around the clock.
                </p>
              </div>
            </div>
          </div>

          {/* Infrastructure Guarantee */}
          <div className="p-4 rounded-xl bg-card/60 border border-border/80 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Server className="h-4 w-4 text-primary" />
              Isolated Multi-Tenant Architecture
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Your organization data is compartmentalized with server-side
              tenant derivation. No organization data can ever leak across
              account boundaries.
            </p>
          </div>
        </div>

        {/* Bottom Compliance Badges */}
        <div className="relative z-10 flex items-center gap-6 pt-6 border-t border-border/50 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> GDPR & SOC 2
            Ready
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 172 Automated
            Tests Verified
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Enterprise
            Grade
          </span>
        </div>
      </div>

      {/* Right Column: Registration Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-auto">
          <div className="space-y-2 text-center lg:text-left">
            <div className="lg:hidden mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Create Your Organization
            </h2>
            <p className="text-xs text-muted-foreground">
              Get started in seconds. No credit card required.
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border/70 p-6 md:p-8 shadow-xl">
            <RegisterForm />
          </div>

          <p className="text-center text-[11px] text-muted-foreground leading-normal">
            By creating an account, you agree to Bug Tracker&apos;s{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
