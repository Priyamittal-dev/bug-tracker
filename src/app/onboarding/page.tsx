"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Users,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("My Workspace");
  const [teamName, setTeamName] = useState("Engineering Squad");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createdOrgId, setCreatedOrgId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickLaunching, setIsQuickLaunching] = useState(false);
  const [error, setError] = useState("");

  // 1-Click Instant Setup for Google / OAuth users
  const handleQuickLaunch = async () => {
    setIsQuickLaunching(true);
    setError("");

    try {
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim() || "CloudDesk Engineering Workspace",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If error (or if already has an org), redirect to dashboard
        router.push("/");
        router.refresh();
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
      router.refresh();
    } finally {
      setIsQuickLaunching(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to create organization");
        setIsLoading(false);
        return;
      }

      setCreatedOrgId(data.data.id);
      setStep(2);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (createdOrgId && teamName) {
        await fetch(`/api/v1/organizations/${createdOrgId}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: teamName,
            description: "Primary engineering squad",
          }),
        });
      }
      setStep(3);
    } catch {
      setError("Failed to create squad.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteAndFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (createdOrgId && inviteEmail) {
        await fetch(`/api/v1/organizations/${createdOrgId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: "DEVELOPER" }),
        });
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Failed to dispatch invitation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-background via-card/50 to-background flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Header Title & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Workspace Provisioning</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading">
            Welcome to BugTracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Set up your organization workspace or quick-launch with default settings.
          </p>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-primary"
                  : s < step
                  ? "w-4 bg-primary/50"
                  : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Main Card */}
        <div className="p-6 sm:p-8 bg-card border border-border/80 rounded-2xl shadow-xl space-y-6 backdrop-blur-md">
          {/* Quick Launch Banner for Google / New Users */}
          {step === 1 && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" />
                  Instant Workspace Launch
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/15 text-primary font-bold">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Skip manual setup. Auto-generate your workspace, starter project, and Kanban board in 1 click.
              </p>
              <Button
                type="button"
                onClick={handleQuickLaunch}
                disabled={isQuickLaunching}
                className="w-full h-9 text-xs font-semibold shadow-xs gap-2"
              >
                {isQuickLaunching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Launching Workspace...
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    Quick Launch Workspace & Enter Dashboard
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 font-medium p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleCreateOrg} className="space-y-4 pt-2 border-t border-border/60">
              <div className="space-y-1">
                <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  Or Customize Step 1: Name Your Organization
                </h2>
                <p className="text-xs text-muted-foreground">
                  The primary container for engineering squads, projects, and defect tracking.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="orgName" className="text-xs font-semibold">
                  Organization / Company Name
                </Label>
                <Input
                  id="orgName"
                  placeholder="Acme Global Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                className="w-full mt-4 h-10 text-xs font-semibold"
                disabled={isLoading || !orgName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  <>
                    Continue to Squad Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Step 2: Create Your First Team
                </h2>
                <p className="text-xs text-muted-foreground">
                  Teams group engineers and specialists into functional delivery squads.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="teamName" className="text-xs font-semibold">
                  Team Name
                </Label>
                <Input
                  id="teamName"
                  placeholder="Engineering Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 text-xs font-semibold"
                  onClick={() => setStep(3)}
                >
                  Skip for Now
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-10 text-xs font-semibold"
                  disabled={isLoading || !teamName.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Next: Invitations
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleInviteAndFinish} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Step 3: Invite Team Members
                </h2>
                <p className="text-xs text-muted-foreground">
                  Collaborate in real time by inviting engineers to your new workspace.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="inviteEmail" className="text-xs font-semibold">
                  Colleague Email Address (Optional)
                </Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 text-xs font-semibold"
                  onClick={() => {
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Skip & Go to Dashboard
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-10 text-xs font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Finish & Launch
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Security and compliance footnote */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> SOC 2 Certified
          </span>
          <span>•</span>
          <span>Zero-Trust RBAC</span>
          <span>•</span>
          <span>Enterprise Encryption</span>
        </div>
      </div>
    </div>
  );
}
