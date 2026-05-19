import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  usd,
  tone = "success",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  usd?: string;
  tone?: "success" | "warning" | "destructive" | "info";
}) {
  return (
    <article className="panel flex items-center gap-4">
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-lg",
          tone === "success" && "bg-success/10 text-success",
          tone === "warning" && "bg-warning/10 text-warning",
          tone === "destructive" && "bg-destructive/10 text-destructive",
          tone === "info" && "bg-info/10 text-info",
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className="mt-1 block truncate font-mono text-3xl font-bold leading-none">{value}</span>
        {delta ? <span className="mt-2 block text-xs text-success">{delta}</span> : null}
        {usd ? <span className="mt-1 block font-mono text-xs text-muted-foreground">~ {usd}</span> : null}
      </span>
    </article>
  );
}
