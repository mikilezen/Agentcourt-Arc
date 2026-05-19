import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AgentAvatar } from "@/components/agent-avatar";
import { SeverityBadge } from "@/components/severity-badge";
import { formatExplorerUrl, truncateAddress } from "@/lib/format";
import { getAgentName } from "@/lib/mock-data";
import { Violation } from "@/lib/types";

export function ViolationsTable({ violations }: { violations: Violation[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th scope="col" className="w-12 px-4 py-3">#</th>
              <th scope="col" className="px-4 py-3">Agent</th>
              <th scope="col" className="px-4 py-3">Reason</th>
              <th scope="col" className="px-4 py-3">Severity</th>
              <th scope="col" className="px-4 py-3">Reported At</th>
              <th scope="col" className="px-4 py-3">Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((violation, index) => (
              <tr key={violation.id} className="table-row">
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AgentAvatar address={violation.agentAddress} />
                    <div>
                      <span className="block font-mono" title={violation.agentAddress}>
                        {truncateAddress(violation.agentAddress)}
                      </span>
                      <span className="text-xs text-muted-foreground">{getAgentName(violation.agentAddress)}</span>
                    </div>
                  </div>
                </td>
                <td className="max-w-[320px] truncate px-4 py-3">{violation.reason}</td>
                <td className="px-4 py-3"><SeverityBadge severity={violation.severity} /></td>
                <td className="px-4 py-3 text-muted-foreground">{violation.reportedAt}</td>
                <td className="px-4 py-3">
                  <Link
                    href={formatExplorerUrl(violation.txHash)}
                    className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                  >
                    {truncateAddress(violation.txHash, 8, 6)}
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-border md:hidden">
        {violations.map((violation, index) => (
          <article key={violation.id} className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">#{index + 1}</span>
              <SeverityBadge severity={violation.severity} />
            </div>
            <div className="flex items-center gap-3">
              <AgentAvatar address={violation.agentAddress} />
              <span className="font-mono text-sm" title={violation.agentAddress}>
                {truncateAddress(violation.agentAddress)}
              </span>
            </div>
            <p className="text-sm">{violation.reason}</p>
            <Link href={formatExplorerUrl(violation.txHash)} className="font-mono text-sm text-primary hover:underline">
              {truncateAddress(violation.txHash, 8, 6)}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
