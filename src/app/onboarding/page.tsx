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
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [teamName, setTeamName] = useState("Engineering");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createdOrgId, setCreatedOrgId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Workspace Provisioning</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Welcome to BugTracker
          </h1>
          <p className="text-xs text-muted-foreground">
            Set up your organization workspace and invite your engineering team.
          </p>
        </div>

        {/* Step progress pills */}
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

        <div className="p-8 bg-card border border-border rounded-2xl shadow-xl space-y-6">
          {error && (
            <div className="text-xs text-red-500 font-medium p-2.5 bg-red-500/10 rounded-md border border-red-500/20">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  Step 1: Name Your Organization
                </h2>
                <p className="text-xs text-muted-foreground">
                  This is the top-level container for your engineering teams,
                  projects, and defects.
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
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isLoading || !orgName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  <>
                    Continue to Teams
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
                  Teams group engineers and specialists into functional delivery
                  squads.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="teamName" className="text-xs font-semibold">
                  Team Name
                </Label>
                <Input
                  id="teamName"
                  placeholder="Engineering"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(3)}
                >
                  Skip for Now
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !teamName.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
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
                  Step 3: Invite Your Colleagues
                </h2>
                <p className="text-xs text-muted-foreground">
                  Bring your teammates on board to collaborate on defects and
                  sprints.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="inviteEmail" className="text-xs font-semibold">
                  Teammate&apos;s Work Email
                </Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/")}
                >
                  Complete Without Inviting
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Launch Workspace"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
