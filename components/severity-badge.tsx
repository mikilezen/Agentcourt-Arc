import { Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const labels: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] border px-2.5 py-0.5 text-xs font-normal",
        severity === "high" && "border-destructive/30 bg-destructive/10 text-destructive",
        severity === "medium" && "border-warning/30 bg-warning/10 text-warning",
        severity === "low" && "border-info/30 bg-info/10 text-info",
        className,
      )}
    >
      {labels[severity]}
    </span>
  );
}
