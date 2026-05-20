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

      <section className="panel">
        <div className="flex flex-wrap gap-2">
          {["Overview", `Violations (${scopedViolations.length})`, "Transactions"].map((tab, index) => (
            <button key={tab} className={`rounded-lg px-4 py-2 text-sm ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">About this agent</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{agent.summary}</p>
          </div>
          <dl className="grid gap-3 text-sm">
            <Info label="Registered At" value={agent.registeredAt} />
            <Info label="Last Updated" value={agent.lastUpdated} />
            <Info label="Owner" value={agent.owner} title={agent.owner} />
          </dl>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Violations</h2>
        {scopedViolations.length ? (
          <ViolationsTable violations={scopedViolations} />
        ) : (
          <div className="panel text-center text-sm text-muted-foreground">No violations yet. This agent is behaving.</div>
        )}
      </section>

      <section className="panel">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <div className="mt-4 divide-y divide-border">
          {scopedTransactions.map((tx) => (
            <div key={tx.hash} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_120px_120px_100px]">
              <Link href={formatExplorerUrl(tx.hash)} className="inline-flex items-center gap-1 font-mono text-primary hover:underline">
                {truncateAddress(tx.hash, 10, 8)}
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
              <span>{tx.type}</span>
              <span className="font-mono">{formatUSDC(tx.value)}</span>
              <span className="text-muted-foreground">{tx.time}</span>
            </div>
          ))}
          {!scopedTransactions.length ? <p className="py-4 text-sm text-muted-foreground">No transactions in the mock ledger.</p> : null}
        </div>
      </section>
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

function Info({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono" title={title}>{title ? truncateAddress(value, 10, 8) : value}</dd>
    </div>
  );
}
