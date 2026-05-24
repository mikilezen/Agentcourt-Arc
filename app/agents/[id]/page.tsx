import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AgentAvatar } from "@/components/agent-avatar";
import { reputationTone } from "@/components/reputation-badge";
import { StatusBadge } from "@/components/status-badge";
import { ViolationsTable } from "@/components/violations-table";
import { formatExplorerUrl, formatUSDC, truncateAddress } from "@/lib/format";
import {
  buildTransactionsFromViolations,
  fetchAgentById,
  fetchViolationsByAgent,
} from "@/lib/demo-data";
import { AgentDetailTabs } from "@/components/agent-detail-tabs";

interface AgentDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailsPage({ params }: AgentDetailsPageProps) {
  const { id } = await params;
  const agent = await fetchAgentById(id);

  if (!agent) notFound();

  const scopedViolations = await fetchViolationsByAgent(id);
  const scopedTransactions = buildTransactionsFromViolations(scopedViolations);
  const tone = reputationTone(agent.reputation);

  return (
    <>
      <Link href="/agents" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Agents
      </Link>

      <section className="panel flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AgentAvatar address={agent.address} className="size-14 text-sm" />
          <div>
            <h1 className="text-balance text-3xl font-semibold leading-tight">{agent.name}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground" title={agent.address}>
              {truncateAddress(agent.address, 10, 8)}
            </p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="panel">
          <p className="text-sm text-muted-foreground">Reputation Score</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-mono text-3xl font-bold">{agent.reputation}</span>
            <span className="pb-1 font-mono text-sm text-muted-foreground">/ 100</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${agent.reputation}%` }}
            />
          </div>
        </article>
        <DetailStat label="Staked Amount" value={formatUSDC(agent.stakedUsdc)} />
        <DetailStat label="Total Violations" value={String(agent.violations)} />
        <article className="panel">
          <p className="text-sm text-muted-foreground">Status</p>
          <div className="mt-4"><StatusBadge status={agent.status} /></div>
        </article>
      </section>

      <AgentDetailTabs
        agent={agent}
        violations={scopedViolations}
        transactions={scopedTransactions}
      />
    </>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="panel">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold leading-none">{value}</p>
    </article>
  );
}
