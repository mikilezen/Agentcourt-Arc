import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AgentAvatar } from "@/components/agent-avatar";
import { ReputationBadge } from "@/components/reputation-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatUSDC, truncateAddress } from "@/lib/format";
import { Agent } from "@/lib/types";

export function AgentsTable({ agents, limit }: { agents: Agent[]; limit?: number }) {
  const rows = typeof limit === "number" ? agents.slice(0, limit) : agents;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th scope="col" className="w-12 px-4 py-3">#</th>
              <th scope="col" className="px-4 py-3">Agent</th>
              <th scope="col" className="px-4 py-3">Reputation</th>
              <th scope="col" className="px-4 py-3 text-right">Staked</th>
              <th scope="col" className="px-4 py-3 text-right">Violations</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((agent, index) => (
              <tr key={agent.address} className="table-row">
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3">
                  <AgentCell agent={agent} />
                </td>
                <td className="px-4 py-3"><ReputationBadge score={agent.reputation} /></td>
                <td className="px-4 py-3 text-right font-mono">{formatUSDC(agent.stakedUsdc)}</td>
                <td className="px-4 py-3 text-right font-mono">{agent.violations}</td>
                <td className="px-4 py-3"><StatusBadge status={agent.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/agents/${encodeURIComponent(agent.address)}`}>
                      View <ExternalLink className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {rows.map((agent, index) => (
          <article key={agent.address} className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
              <AgentCell agent={agent} />
              <span className="text-sm text-muted-foreground">#{index + 1}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Reputation" value={<ReputationBadge score={agent.reputation} />} />
              <Field label="Status" value={<StatusBadge status={agent.status} />} />
              <Field label="Staked" value={<span className="font-mono">{formatUSDC(agent.stakedUsdc)}</span>} />
              <Field label="Violations" value={<span className="font-mono">{agent.violations}</span>} />
            </div>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link href={`/agents/${encodeURIComponent(agent.address)}`}>View agent</Link>
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}

function AgentCell({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-center gap-3">
      <AgentAvatar address={agent.address} />
      <div className="min-w-0">
        <span className="block truncate font-mono text-sm font-medium" title={agent.address}>
          {truncateAddress(agent.address)}
        </span>
        <span className="block text-xs text-muted-foreground">{agent.name}</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );
}
