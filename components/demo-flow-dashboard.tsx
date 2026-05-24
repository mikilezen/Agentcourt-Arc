"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAccount } from "wagmi";

import { AgentsTable } from "@/components/agents-table";
import { BuildTrustBanner } from "@/components/build-trust-banner";
import { HeroCard } from "@/components/hero-card";
import { RecentViolations } from "@/components/recent-violations";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Agent, AgentStatus, Severity, Violation } from "@/lib/types";
import { AlertTriangle, ArrowRightIcon, DollarSign, Flame, Users } from "lucide-react";

type ApiSnapshot = {
  state: {
    connected_wallet: string | null;
    wallet_connected: boolean;
    middleware_status: string | null;
    middleware_reason: string | null;
    last_contract_tx_hash: string | null;
    last_action: string | null;
  };
  agents: Array<{
    id: string;
    name: string;
    owner: string;
    reputation: number;
    staked_usdc: number;
    total_violations: number;
    total_slashed: number;
    status: AgentStatus;
    updated_at?: string;
  }>;
  violations: Array<{
    id: string;
    agent_id: string;
    agent_name: string;
    agent_owner: string;
    reason: string;
    severity: Severity;
    slash_amount: number;
    tx_hash: string;
    created_at: string;
  }>;
};

function toRelativeTime(input?: string): string {
  if (!input) {
    return "just now";
  }

  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) {
    return "just now";
  }

  const deltaSeconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
}

function mapApiAgent(agent: ApiSnapshot["agents"][number]): Agent {
  return {
    address: agent.id,
    name: agent.name,
    owner: agent.owner,
    reputation: agent.reputation,
    stakedUsdc: agent.staked_usdc,
    violations: agent.total_violations,
    status: agent.status,
    registeredAt: "demo flow",
    lastUpdated: agent.updated_at ? new Date(agent.updated_at).toUTCString() : "just now",
    summary: "Demo flow agent persisted in Supabase.",
  };
}

function mapApiViolation(v: ApiSnapshot["violations"][number]): Violation {
  return {
    id: v.id,
    agentAddress: v.agent_id,
    reason: v.reason,
    severity: v.severity,
    reportedAt: toRelativeTime(v.created_at),
    txHash: v.tx_hash,
    slashAmount: v.slash_amount,
  };
}

function readConfiguredContractAddress(): `0x${string}` | undefined {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("agentcourt_contract_address");
    if (stored?.startsWith("0x")) {
      return stored as `0x${string}`;
    }
  }

  return process.env.NEXT_PUBLIC_AGENT_COURT_ADDRESS as `0x${string}` | undefined;
}

export function DemoFlowDashboard() {
  const { isConnected } = useAccount();
  const [snapshot, setSnapshot] = useState<ApiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agentCourtAddress, setAgentCourtAddress] = useState<`0x${string}` | undefined>(undefined);
  const [agentCourtAddressInput, setAgentCourtAddressInput] = useState("");

  // Resolve contract address
  const resolveContracts = useCallback(() => {
    const resolved = readConfiguredContractAddress();
    setAgentCourtAddress(resolved);
    setAgentCourtAddressInput(resolved ?? "");
  }, []);

  useEffect(() => {
    resolveContracts();
  }, [resolveContracts]);

  const handleSaveContractAddress = useCallback(() => {
    setError(null);
    if (typeof window === "undefined") return;

    const trimmed = agentCourtAddressInput.trim();
    if (!trimmed) {
      window.localStorage.removeItem("agentcourt_contract_address");
      resolveContracts();
      window.dispatchEvent(new CustomEvent("agentcourt:contracts-deployed"));
      return;
    }

    if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
      setError("Invalid Ethereum contract address format.");
      return;
    }

    window.localStorage.setItem("agentcourt_contract_address", trimmed);
    resolveContracts();
    window.dispatchEvent(new CustomEvent("agentcourt:contracts-deployed"));
  }, [agentCourtAddressInput, resolveContracts]);

  const handleClearContractOverride = useCallback(() => {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem("agentcourt_contract_address");
    resolveContracts();
    window.dispatchEvent(new CustomEvent("agentcourt:contracts-deployed"));
  }, [resolveContracts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/demo-flow", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load demo flow state.");
      }

      setSnapshot(data.snapshot as ApiSnapshot);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load demo flow state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => {
      void load();
    };

    window.addEventListener("agentcourt:wallet-connected", handler);
    window.addEventListener("agentcourt:session-changed", handler);
    return () => {
      window.removeEventListener("agentcourt:wallet-connected", handler);
      window.removeEventListener("agentcourt:session-changed", handler);
    };
  }, [load]);

  const agents = useMemo(() => (snapshot?.agents ?? []).map(mapApiAgent), [snapshot]);
  const violations = useMemo(() => (snapshot?.violations ?? []).map(mapApiViolation), [snapshot]);

  const stats = useMemo(() => {
    const totalAgents = agents.length;
    const totalStaked = agents.reduce((sum, agent) => sum + agent.stakedUsdc, 0);
    const totalViolations = agents.reduce((sum, agent) => sum + agent.violations, 0);
    const totalSlashed = snapshot?.agents.reduce((sum, agent) => sum + agent.total_slashed, 0) ?? 0;

    return [
      {
        label: "Total Agents",
        value: `${totalAgents}`,
        tone: "success" as const,
        delta: "protocol-wide",
        icon: Users,
      },
      {
        label: "Total Staked",
        value: `${totalStaked.toFixed(2)} USDC`,
        tone: "success" as const,
        icon: DollarSign,
      },
      {
        label: "Violations Reported",
        value: `${totalViolations}`,
        tone: "warning" as const,
        delta: "live from middleware",
        icon: AlertTriangle,
      },
      {
        label: "Total Slashed",
        value: `${totalSlashed.toFixed(2)} USDC`,
        tone: "destructive" as const,
        icon: Flame,
      },
    ];
  }, [agents, snapshot]);

  return (
    <>
      <HeroCard />

      {/* Developer Contract Configuration Panel */}
      <section className="panel space-y-4">
        <h2 className="text-lg font-semibold">Developer Settings</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">AgentCourt Contract Address (Arc Testnet)</span>
            <div className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none"
                value={agentCourtAddressInput}
                onChange={(e) => setAgentCourtAddressInput(e.target.value)}
                placeholder="0x..."
              />
              <Button size="sm" onClick={handleSaveContractAddress}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClearContractOverride}>
                Clear
              </Button>
            </div>
            <span className="text-[10px] text-muted-foreground">
              If not configured, the interface relies on the offline simulator state.
            </span>
          </div>
          <div className="flex flex-col justify-center rounded-lg border border-border bg-background/40 p-3 text-xs space-y-1">
            <p>
              Status:{" "}
              <span className={agentCourtAddress ? "text-success font-semibold" : "text-warning font-semibold"}>
                {agentCourtAddress ? "Real Web3 Mode Active" : "Offline Simulator Fallback"}
              </span>
            </p>
            {agentCourtAddress && (
              <p>
                Connected Address: <span className="font-mono">{agentCourtAddress}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading protocol stats...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            tone={stat.tone}
            icon={stat.icon}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-0">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-semibold leading-snug">Top Agents (Leaderboard)</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/agents" className="text-primary">
                View all <ArrowRightIcon />
              </Link>
            </Button>
          </div>
          <div className="px-6 pb-6">
            <AgentsTable agents={[...agents].sort((left, right) => right.reputation - left.reputation)} limit={5} />
          </div>
        </div>
        <RecentViolations violations={violations} />
      </section>

      <BuildTrustBanner />
    </>
  );
}
