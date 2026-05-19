import { cn } from "@/lib/utils";

export function reputationTone(score: number) {
  if (score >= 85) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

export function ReputationBadge({ score, className }: { score: number; className?: string }) {
  const tone = reputationTone(score);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
        tone === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {score}
    </span>
  );
}
