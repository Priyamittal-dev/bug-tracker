import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import {
  ShieldAlert,
  CheckCircle2,
  Zap,
  ShieldCheck,
  BarChart3,
  Users,
  Sparkles,
} from "lucide-react";

export default async function LoginPage() {
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
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">
              BUG<b>TRACKER</b>
            </span>
            <span className="ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary font-semibold">
              ENTERPRISE
            </span>
          </div>
        </div>

        {/* Center Content / Highlights */}
        <div className="relative z-10 space-y-8 my-auto max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/80 border border-border text-xs text-muted-foreground font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Next-Generation Defect Intelligence
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Where Engineering Teams Squash Bugs{" "}
              <span className="text-primary">10x Faster</span>.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unified defect reporting, automated regression prevention,
              multi-tenant isolation, and real-time sprint execution built for
              mission-critical software teams.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Zero-Trust Multi-Tenancy
                </p>
                <p className="text-xs text-muted-foreground">
                  Strict organizational boundaries, RBAC roles, and tenant
                  context derived server-side.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  172+ Automated Unit & Integration Tests
                </p>
                <p className="text-xs text-muted-foreground">
                  Guaranteed 100% test coverage with automated daily regression
                  prevention.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Agile Sprints & Real-Time Burndown
                </p>
                <p className="text-xs text-muted-foreground">
                  Story point tracking, velocity metrics, and automated issue
                  rollover.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial Quote */}
          <div className="p-4 rounded-xl bg-card/60 border border-border/80 text-xs space-y-2">
            <p className="italic text-muted-foreground">
              &quot;BugTracker simplified our entire QA and bug triage process.
              Having reproducible defect schemas with stack traces and SLA
              monitoring has cut our time-to-fix in half.&quot;
            </p>
            <div className="flex items-center gap-2 pt-1">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-[10px]">
                SC
              </div>
              <div>
                <p className="font-semibold text-foreground text-[11px]">
                  Sarah Chen
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Lead QA Engineer
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Compliance Badges */}
        <div className="relative z-10 flex items-center gap-6 pt-6 border-t border-border/50 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> SOC 2 Type II
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> AES-256
            Encryption
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 99.99% SLA
          </span>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <div className="lg:hidden mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter your corporate credentials or use a 1-click testing account
              below.
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border/70 p-6 md:p-8 shadow-xl">
            <LoginForm />
          </div>

          <p className="text-center text-[11px] text-muted-foreground leading-normal">
            Protected by enterprise SSL encryption. By continuing, you agree to
            Bug Tracker&apos;s{" "}
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
