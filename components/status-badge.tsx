import { AgentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusMap: Record<AgentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "text-success" },
  "at-risk": { label: "At Risk", className: "text-warning" },
  slashed: { label: "Slashed", className: "text-destructive" },
};

export function StatusBadge({ status, className }: { status: AgentStatus; className?: string }) {
  const item = statusMap[status];

  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-medium", item.className, className)}>
      <span className="size-2 rounded-full bg-current" />
      {item.label}
    </span>
  );
}
