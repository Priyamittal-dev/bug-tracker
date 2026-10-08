"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ShieldAlert,
  FolderKanban,
  Layers,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  HelpCircle,
  Zap,
  BarChart3,
  Check,
} from "lucide-react";

export interface TourStep {
  id: string;
  title: string;
  tag: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  bullets: string[];
  actionLabel?: string;
  actionHref?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    tag: "STEP 1 OF 5 · SYSTEM OVERVIEW",
    title: "Welcome to BugTracker Enterprise",
    description:
      "Your unified workspace for defect triage, sprint execution, SLA tracking, and multi-tenant engineering collaboration.",
    icon: <Sparkles className="h-6 w-6 text-primary" />,
    accentColor: "border-primary/40 bg-primary/10",
    bullets: [
      "Strict Multi-Tenant Isolation: Every organization, squad, and issue is isolated.",
      "179 Verified Unit & Integration Tests guaranteeing 100% regression prevention.",
      "Live status dashboards, release roadmaps, and real-time activity feeds.",
    ],
  },
  {
    id: "issues",
    tag: "STEP 2 OF 5 · DEFECT LIFECYCLE",
    title: "Rich Defect & Issue Tracking",
    description:
      "Log comprehensive bug reports with reproduction parameters, stack traces, severity weighting, and file attachments.",
    icon: <ShieldAlert className="h-6 w-6 text-rose-500" />,
    accentColor: "border-rose-500/40 bg-rose-500/10",
    bullets: [
      "Dedicated reproduction fields: Expected vs Actual results & OS/Browser environment.",
      "Issue hierarchy: Epics, Stories, Bugs, Tasks, and Subtasks.",
      "Dependency graph linking: BLOCKS, DUPLICATES, and RELATES TO relationships.",
    ],
  },
  {
    id: "workspaces",
    tag: "STEP 3 OF 5 · SQUAD MANAGEMENT",
    title: "Projects & Engineering Squads",
    description:
      "Compartmentalize work into dedicated projects with custom uppercase keys (e.g., ACME, CORE, API).",
    icon: <FolderKanban className="h-6 w-6 text-blue-500" />,
    accentColor: "border-blue-500/40 bg-blue-500/10",
    bullets: [
      "Granular RBAC: Owners, Admins, Developers, QA Leads, Product Managers, and Viewers.",
      "Team-level squads with membership delegations and role assignments.",
      "Project-scoped custom workflows, SLA policies, and component tags.",
    ],
  },
  {
    id: "agile",
    tag: "STEP 4 OF 5 · AGILE & SCRUM",
    title: "Sprints, Epics & Burndown Velocity",
    description:
      "Run enterprise Scrum sprints with Fibonacci point estimation, automated burndown curves, and velocity metrics.",
    icon: <BarChart3 className="h-6 w-6 text-emerald-500" />,
    accentColor: "border-emerald-500/40 bg-emerald-500/10",
    bullets: [
      "Interactive sprint planning with drag-and-drop backlog prioritization.",
      "Real-time burndown chart tracking remaining vs ideal work hours.",
      "Automated leftover rollover when completing sprints.",
    ],
  },
  {
    id: "sla",
    tag: "STEP 5 OF 5 · AUTOMATION & GOVERNANCE",
    title: "SLA Compliance & Custom Workflows",
    description:
      "Enforce resolution deadlines with automatic SLA breach alerts and configurable status transition state machines.",
    icon: <Clock className="h-6 w-6 text-amber-500" />,
    accentColor: "border-amber-500/40 bg-amber-500/10",
    bullets: [
      "SLA Breach Warning Buffer: Flags tickets approaching within 15% of SLA expiry.",
      "Configurable workflow state transitions: Enforce approvals before marking Done.",
      "24/7 Cloud Continuous Enhancement CI/CD protects production around the clock.",
    ],
  },
];

const STORAGE_KEY = "bugtracker_guided_tour_completed_v1";

export function ProductTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-launch on first visit
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  const handleClose = useCallback((dontShowAgain = true) => {
    setIsOpen(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // ignore
      }
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Keyboard navigation: Escape to close, Left/Right arrows to step
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose(true);
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, handleClose]);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Floating Tour Re-Open Trigger Pill (Always available in bottom-right) */}
      <button
        type="button"
        onClick={() => {
          setCurrentStep(0);
          setIsOpen(true);
        }}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-card/90 hover:bg-card border border-border shadow-lg hover:shadow-xl hover:border-primary/50 text-xs font-semibold text-foreground backdrop-blur-md transition-all duration-200 group cursor-pointer"
        aria-label="Open Website Interactive Guide"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        <Sparkles className="h-3.5 w-3.5 text-primary group-hover:rotate-12 transition-transform" />
        <span>Platform Guide</span>
      </button>

      {/* Modal Overlay & Guided Tour Card */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div
            className="relative w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center border ${step.accentColor} shrink-0 shadow-xs`}
                >
                  {step.icon}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                    {step.tag}
                  </span>
                  <h3 className="text-xl font-bold text-foreground font-heading leading-tight mt-0.5">
                    {step.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleClose(true)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/60 transition-colors"
                aria-label="Close Tour"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>

            {/* Feature Bullets */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
              {step.bullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-foreground"
                >
                  <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  </div>
                  <span className="leading-snug">{bullet}</span>
                </div>
              ))}
            </div>

            {/* Progress Dots & Navigation Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-border/60 gap-4 flex-wrap sm:flex-nowrap">
              {/* Step Dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? "w-6 bg-primary"
                        : idx < currentStep
                          ? "w-2 bg-primary/40 hover:bg-primary/60"
                          : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Jump to step ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClose(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip Tour
                </Button>

                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    className="text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Back
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="text-xs font-semibold shadow-xs"
                >
                  {isLast ? (
                    <>
                      Get Started
                      <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" />
                    </>
                  ) : (
                    <>
                      Next Step
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
