"use client";

import { useMemo, useState } from "react";
import { AgentsTable } from "@/components/agents-table";
import { Agent } from "@/lib/types";

const TABS = ["By Reputation", "By Staked Amount", "By Trust Score"] as const;
type Tab = (typeof TABS)[number];

function computeTrustScore(agent: Agent): number {
  const repComponent = (agent.reputation / 100) * 0.6;
  const stakeComponent = Math.min(1, agent.stakedUsdc / 10000) * 0.1;
  const historyComponent = (1 - Math.min(1, agent.violations / (agent.violations + 10))) * 0.1;
  const stabilityComponent = agent.status === "active" ? 0.2 : agent.status === "at-risk" ? 0.1 : 0;
  return repComponent + stakeComponent + historyComponent + stabilityComponent;
}

export function LeaderboardsClient({ agents }: { agents: Agent[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("By Reputation");

  const sorted = useMemo(() => {
    const copy = [...agents];
    switch (activeTab) {
      case "By Reputation":
        return copy.sort((a, b) => b.reputation - a.reputation);
      case "By Staked Amount":
        return copy.sort((a, b) => b.stakedUsdc - a.stakedUsdc);
      case "By Trust Score":
        return copy.sort((a, b) => computeTrustScore(b) - computeTrustScore(a));
      default:
        return copy;
    }
  }, [agents, activeTab]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              tab === activeTab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <AgentsTable agents={sorted} />
    </div>
  );
}
