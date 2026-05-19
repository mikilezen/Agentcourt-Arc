import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Agent, AgentStatus, Severity, Transaction, Violation } from "@/lib/types";

const AGENTS_TABLE = "agentcourt_demo_agents";
const VIOLATIONS_TABLE = "agentcourt_demo_violations";

type AgentRow = {
  id: string;
  name: string;
  owner: string | null;
  category?: string | null;
  description?: string | null;
  policy?: string | null;
  reputation: number | null;
  staked_usdc: number | string | null;
  total_violations: number | null;
  total_slashed: number | string | null;
  status: string | null;
  updated_at?: string | null;
};

type ViolationRow = {
  id: string;
  agent_id: string;
  agent_name: string | null;
  agent_owner: string | null;
  reason: string | null;
  severity: string | null;
  slash_amount: number | string | null;
  tx_hash: string | null;
  created_at: string | null;
};

function toRelativeTime(input?: string | null): string {
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

function coerceStatus(value?: string | null): AgentStatus {
  if (value === "active" || value === "at-risk" || value === "slashed") {
    return value;
  }

  return "active";
}

function statusSummary(status: AgentStatus): string {
  switch (status) {
    case "at-risk":
      return "At risk from recent policy incidents.";
    case "slashed":
      return "Slashed after policy violations.";
    case "active":
    default:
      return "Active and in good standing.";
  }
}

function coerceSeverity(value?: string | null): Severity {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "low";
}

function mapAgentRow(row: AgentRow): Agent {
  const status = coerceStatus(row.status);
  const updatedAt = row.updated_at ? new Date(row.updated_at).toUTCString() : "demo flow";

  return {
    address: row.id,
    name: row.name,
    owner: row.owner ?? "unknown",
    reputation: Number(row.reputation ?? 0),
    stakedUsdc: Number(row.staked_usdc ?? 0),
    violations: Number(row.total_violations ?? 0),
    status,
    registeredAt: updatedAt,
    lastUpdated: updatedAt,
    summary: row.description ?? statusSummary(status),
  };
}

function mapViolationRow(row: ViolationRow): Violation {
  return {
    id: row.id,
    agentAddress: row.agent_id,
    agentName: row.agent_name ?? undefined,
    reason: row.reason ?? "policy violation",
    severity: coerceSeverity(row.severity),
    reportedAt: toRelativeTime(row.created_at),
    txHash: row.tx_hash ?? "",
    slashAmount: Number(row.slash_amount ?? 0),
  };
}

export async function fetchAgents(): Promise<Agent[]> {
  const supabase = getSupabaseServerClient();
  const result = await supabase
    .from(AGENTS_TABLE)
    .select("*")
    .order("reputation", { ascending: false })
    .returns<AgentRow[]>();

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map(mapAgentRow);
}

export async function fetchAgentById(id: string): Promise<Agent | null> {
  const supabase = getSupabaseServerClient();
  const decoded = decodeURIComponent(id);

  const result = await supabase
    .from(AGENTS_TABLE)
    .select("*")
    .eq("id", decoded)
    .maybeSingle<AgentRow>();

  if (result.error) {
    throw result.error;
  }

  return result.data ? mapAgentRow(result.data) : null;
}

export async function fetchViolations(): Promise<Violation[]> {
  const supabase = getSupabaseServerClient();
  const result = await supabase
    .from(VIOLATIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ViolationRow[]>();

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map(mapViolationRow);
}

export async function fetchViolationsByAgent(agentId: string): Promise<Violation[]> {
  const supabase = getSupabaseServerClient();
  const decoded = decodeURIComponent(agentId);

  const result = await supabase
    .from(VIOLATIONS_TABLE)
    .select("*")
    .eq("agent_id", decoded)
    .order("created_at", { ascending: false })
    .returns<ViolationRow[]>();

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map(mapViolationRow);
}

export function buildTransactionsFromViolations(violations: Violation[]): Transaction[] {
  return violations
    .filter((violation) => Boolean(violation.txHash))
    .map((violation) => ({
      hash: violation.txHash,
      agentAddress: violation.agentAddress,
      type: "Slash",
      value: violation.slashAmount,
      time: violation.reportedAt,
    }));
}
