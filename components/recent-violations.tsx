import { AlertTriangle } from "lucide-react";

import { SeverityBadge } from "@/components/severity-badge";
import { truncateAddress } from "@/lib/format";
import { getAgentName } from "@/lib/mock-data";
import { Violation } from "@/lib/types";

export function RecentViolations({ violations }: { violations: Violation[] }) {
  return (
    <div className="panel">
      <h2 className="text-xl font-semibold leading-snug">Recent Violations</h2>
      <div className="mt-5 flex flex-col gap-3">
        {violations.slice(0, 5).map((violation) => (
          <article key={violation.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm" title={violation.agentAddress}>
                {truncateAddress(violation.agentAddress)}
              </p>
              <p className="text-xs text-muted-foreground">{getAgentName(violation.agentAddress)}</p>
              <p className="mt-2 text-sm">{violation.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">{violation.reportedAt}</p>
            </div>
            <SeverityBadge severity={violation.severity} />
          </article>
        ))}
      </div>
    </div>
  );
}
