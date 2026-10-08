import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert } from "lucide-react";

interface SlaBadgeProps {
  status: "HEALTHY" | "AT_RISK" | "BREACHED" | "MET" | string;
  dueAt?: Date | string | null;
  type?: "response" | "resolution";
}

export function SlaBadge({
  status,
  dueAt,
  type = "resolution",
}: SlaBadgeProps) {
  const labelPrefix = type === "response" ? "Response" : "Resolution";

  if (status === "MET") {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1 font-medium"
      >
        <CheckCircle className="w-3 h-3 text-emerald-500" />
        {labelPrefix}: Met
      </Badge>
    );
  }

  if (status === "BREACHED") {
    return (
      <Badge
        variant="destructive"
        className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 flex items-center gap-1 font-semibold animate-pulse"
      >
        <ShieldAlert className="w-3 h-3 text-red-500" />
        {labelPrefix}: Breached
      </Badge>
    );
  }

  if (status === "AT_RISK") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 font-medium"
      >
        <AlertTriangle className="w-3 h-3 text-amber-500" />
        {labelPrefix}: At Risk
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="bg-muted text-muted-foreground flex items-center gap-1 font-medium"
    >
      <Clock className="w-3 h-3" />
      {labelPrefix}: Healthy
    </Badge>
  );
}
