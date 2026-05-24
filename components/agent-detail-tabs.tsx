"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ViolationsTable } from "@/components/violations-table";
import { formatExplorerUrl, formatUSDC, truncateAddress } from "@/lib/format";
import { Agent, Transaction, Violation } from "@/lib/types";

const TABS = ["Overview", "Violations", "Transactions"] as const;
type Tab = (typeof TABS)[number];

export function AgentDetailTabs({
  agent,
  violations,
  transactions,
}: {
  agent: Agent;
  violations: Violation[];
  transactions: Transaction[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <>
      <section className="panel">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const label = tab === "Violations" ? `Violations (${violations.length})` : tab;
            return (
              <button
                key={tab}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  tab === activeTab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {activeTab === "Overview" && (
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
        )}
      </section>

      {activeTab === "Violations" && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Violations</h2>
          {violations.length ? (
            <ViolationsTable violations={violations} />
          ) : (
            <div className="panel text-center text-sm text-muted-foreground">No violations yet. This agent is behaving.</div>
          )}
        </section>
      )}

      {activeTab === "Transactions" && (
        <section className="panel">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <div className="mt-4 divide-y divide-border">
            {transactions.map((tx) => (
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
            {!transactions.length ? <p className="py-4 text-sm text-muted-foreground">No transactions in the mock ledger.</p> : null}
          </div>
        </section>
      )}
    </>
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
