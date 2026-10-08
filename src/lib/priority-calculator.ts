/**
 * Issue Priority & Urgency Score Calculator
 * Automatically computes numeric priority score based on severity, SLA window, and impact.
 */

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PriorityScoreOptions {
  severity: SeverityLevel;
  impactUsers?: number;
  hoursRemainingOnSla?: number;
  hasCustomerBlocker?: boolean;
}

export function calculatePriorityScore(options: PriorityScoreOptions): number {
  let score = 0;

  // Severity weights (0-40)
  switch (options.severity) {
    case "CRITICAL":
      score += 40;
      break;
    case "HIGH":
      score += 30;
      break;
    case "MEDIUM":
      score += 20;
      break;
    case "LOW":
      score += 10;
      break;
  }

  // Impact weighting (0-30)
  if (options.impactUsers) {
    if (options.impactUsers > 1000) score += 30;
    else if (options.impactUsers > 100) score += 20;
    else if (options.impactUsers > 10) score += 10;
    else score += 5;
  }

  // SLA Urgency weighting (0-20)
  if (options.hoursRemainingOnSla !== undefined) {
    if (options.hoursRemainingOnSla <= 4) score += 20;
    else if (options.hoursRemainingOnSla <= 12) score += 15;
    else if (options.hoursRemainingOnSla <= 24) score += 10;
    else if (options.hoursRemainingOnSla <= 48) score += 5;
  }

  // Blocker multiplier (0-10)
  if (options.hasCustomerBlocker) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

export function getPriorityTier(score: number): "P0" | "P1" | "P2" | "P3" {
  if (score >= 80) return "P0";
  if (score >= 60) return "P1";
  if (score >= 40) return "P2";
  return "P3";
}
