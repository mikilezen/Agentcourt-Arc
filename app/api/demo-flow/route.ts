import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import {
  AgentCourtOrchestrator,
  createVerifiedAgent,
} from "@/lib/agentcourt-orchestration-sdk";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STATE_TABLE = "agentcourt_demo_state";
const AGENTS_TABLE = "agentcourt_demo_agents";
const VIOLATIONS_TABLE = "agentcourt_demo_violations";

const METATRADER_AGENT_ID = "metatrader-ai";
const HIGH_SLASH_RATE = 0.2;
const HIGH_REPUTATION_PENALTY = 20;

type DemoAction =
  | "connect_wallet"
  | "disconnect_wallet"
  | "register_agent"
  | "register_metatrader"
  | "run_safe_action"
  | "run_market_agent"
  | "simulate_dangerous_action";

type DemoStateRow = {
  id: string;
  connected_wallet: string | null;
  wallet_connected: boolean;
  middleware_status: string | null;
  middleware_reason: string | null;
  last_contract_tx_hash: string | null;
  last_action: string | null;
  updated_at?: string;
};

type DemoAgentRow = {
  id: string;
  name: string;
  owner: string;
  category?: string | null;
  description?: string | null;
  policy?: string | null;
  reputation: number;
  staked_usdc: number;
  total_violations: number;
  total_slashed: number;
  status: "active" | "at-risk" | "slashed";
  updated_at?: string;
};

type DemoViolationRow = {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_owner: string;
  reason: string;
  severity: "low" | "medium" | "high";
  slash_amount: number;
  tx_hash: string;
  created_at: string;
};

type Snapshot = {
  state: DemoStateRow;
  agents: DemoAgentRow[];
  violations: DemoViolationRow[];
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    const details = (error as { details?: unknown }).details;
    const code = (error as { code?: unknown }).code;

    const parts = [message, details, code].filter(
      (part): part is string => typeof part === "string" && part.length > 0
    );

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return fallback;
}

function generateTxHash(): string {
  return `0x${randomBytes(32).toString("hex")}`;
}

function defaultState(): DemoStateRow {
  return {
    id: "default",
    connected_wallet: null,
    wallet_connected: false,
    middleware_status: null,
    middleware_reason: null,
    last_contract_tx_hash: null,
    last_action: null,
  };
}

async function ensureDefaultState() {
  const supabase = getSupabaseServerClient();
  const current = await supabase
    .from(STATE_TABLE)
    .select("*")
    .eq("id", "default")
    .maybeSingle<DemoStateRow>();

  if (current.error) {
    throw current.error;
  }

  if (!current.data) {
    const inserted = await supabase.from(STATE_TABLE).upsert(defaultState()).select("*").single<DemoStateRow>();

    if (inserted.error) {
      throw inserted.error;
    }

    return inserted.data;
  }

  return current.data;
}

async function readSnapshot(): Promise<Snapshot> {
  const supabase = getSupabaseServerClient();
  const state = await ensureDefaultState();

  const [agentsResult, violationsResult] = await Promise.all([
    supabase
      .from(AGENTS_TABLE)
      .select("*")
      .order("reputation", { ascending: false })
      .returns<DemoAgentRow[]>(),
    supabase
      .from(VIOLATIONS_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<DemoViolationRow[]>(),
  ]);

  if (agentsResult.error) {
    throw agentsResult.error;
  }

  if (violationsResult.error) {
    throw violationsResult.error;
  }

  return {
    state,
    agents: agentsResult.data ?? [],
    violations: violationsResult.data ?? [],
  };
}

async function updateState(patch: Partial<DemoStateRow>) {
  const supabase = getSupabaseServerClient();
  const next: DemoStateRow = {
    ...(await ensureDefaultState()),
    ...patch,
    id: "default",
  };

  const updated = await supabase.from(STATE_TABLE).upsert(next).select("*").single<DemoStateRow>();
  if (updated.error) {
    throw updated.error;
  }

  return updated.data;
}

async function ensureMetaTraderRegistered(owner: string) {
  const supabase = getSupabaseServerClient();

  const row: DemoAgentRow = {
    id: METATRADER_AGENT_ID,
    name: "MetaTrader AI",
    owner,
    reputation: 100,
    staked_usdc: 100,
    total_violations: 0,
    total_slashed: 0,
    status: "active",
  };

  const upserted = await supabase.from(AGENTS_TABLE).upsert(row).select("*").single<DemoAgentRow>();
  if (upserted.error) {
    throw upserted.error;
  }

  return upserted.data;
}

async function registerAgent(payload: {
  agentAddress: string;
  name: string;
  owner: string;
  category?: string | null;
  description?: string | null;
  policy?: string | null;
  stakeAmount?: number | null;
}) {
  const supabase = getSupabaseServerClient();

  const existing = await supabase
    .from(AGENTS_TABLE)
    .select("*")
    .eq("id", payload.agentAddress)
    .maybeSingle<DemoAgentRow>();

  if (existing.error) {
    throw existing.error;
  }

  const nextAgent: DemoAgentRow = {
    id: payload.agentAddress,
    name: payload.name,
    owner: payload.owner,
    category: payload.category ?? null,
    description: payload.description ?? null,
    policy: payload.policy ?? null,
    reputation: existing.data?.reputation ?? 100,
    staked_usdc: Number(payload.stakeAmount ?? existing.data?.staked_usdc ?? 0),
    total_violations: existing.data?.total_violations ?? 0,
    total_slashed: existing.data?.total_slashed ?? 0,
    status: existing.data?.status ?? "active",
  };

  const upserted = await supabase.from(AGENTS_TABLE).upsert(nextAgent).select("*").single<DemoAgentRow>();
  if (upserted.error) {
    throw upserted.error;
  }

  return upserted.data;
}

async function simulateDangerousAction() {
  const supabase = getSupabaseServerClient();

  const agentResult = await supabase
    .from(AGENTS_TABLE)
    .select("*")
    .eq("id", METATRADER_AGENT_ID)
    .maybeSingle<DemoAgentRow>();

  if (agentResult.error) {
    throw agentResult.error;
  }

  if (!agentResult.data) {
    throw new Error("MetaTrader AI is not registered yet.");
  }

  const agent = agentResult.data;
  const slashAmount = Number((agent.staked_usdc * HIGH_SLASH_RATE).toFixed(2));
  const remainingStake = Math.max(0, Number((agent.staked_usdc - slashAmount).toFixed(2)));
  const nextReputation = Math.max(0, agent.reputation - HIGH_REPUTATION_PENALTY);
  const txHash = generateTxHash();

  const nextAgent: DemoAgentRow = {
    ...agent,
    staked_usdc: remainingStake,
    reputation: nextReputation,
    total_violations: agent.total_violations + 1,
    total_slashed: Number((agent.total_slashed + slashAmount).toFixed(2)),
    status: remainingStake === 0 ? "slashed" : "active",
  };

  const [agentUpdate, violationInsert] = await Promise.all([
    supabase.from(AGENTS_TABLE).upsert(nextAgent).select("*").single<DemoAgentRow>(),
    supabase
      .from(VIOLATIONS_TABLE)
      .insert({
        agent_id: agent.id,
        agent_name: agent.name,
        agent_owner: agent.owner,
        reason: "private_key_exfiltration",
        severity: "high",
        slash_amount: slashAmount,
        tx_hash: txHash,
      })
      .select("*")
      .single<DemoViolationRow>(),
  ]);

  if (agentUpdate.error) {
    throw agentUpdate.error;
  }

  if (violationInsert.error) {
    throw violationInsert.error;
  }

  await updateState({
    middleware_status: "blocked",
    middleware_reason: "private_key_exfiltration",
    last_contract_tx_hash: txHash,
    last_action: "simulate_dangerous_action",
  });

  return {
    agent: agentUpdate.data,
    violation: violationInsert.data,
    txHash,
  };
}

async function runMarketAgent() {
  const supabase = getSupabaseServerClient();
  const state = await ensureDefaultState();
  const owner = state.connected_wallet ?? "0xArcOperator00000000000000000000000000000001";
  const agent = await ensureMetaTraderRegistered(owner);
  const orchestrator = new AgentCourtOrchestrator();
  const sdkAgent = createVerifiedAgent({
    id: agent.id,
    name: agent.name,
    owner: agent.owner,
    strategy: "Agora market agent with Arc USDC settlement guardrails",
  });

  const confidence = Number((0.7 + Math.random() * 0.18).toFixed(2));
  const notionalUsd = confidence > 0.82 ? 3200 : 1250;
  const calls = [
    {
      tool: "market.read",
      args: {
        market: "Will ETH outperform BTC this week?",
        source: "agora-demo-feed",
      },
    },
    {
      tool: "risk.score",
      args: {
        confidence,
        volatility: "medium",
        notionalUsd,
      },
    },
    {
      tool: "arc.quote",
      args: {
        pair: "USDC/position-token",
        notionalUsd,
      },
    },
    {
      tool: "arc.transfer_usdc",
      args: {
        to: "0xArcMarketMaker0000000000000000000000000001",
        amountUsd: notionalUsd,
        memo: confidence > 0.85 ? "contains private key request" : "autonomous rebalance",
      },
    },
    {
      tool: "arc.publish_trace",
      args: {
        reasoning: "Signal, risk score, and settlement decision recorded for audit.",
        notionalUsd: 0,
      },
    },
  ];

  const events = [];
  for (const call of calls) {
    const result = await orchestrator.callTool(sdkAgent, call.tool, call.args, () => ({
      ok: true,
      txHash: call.tool === "arc.transfer_usdc" ? generateTxHash() : undefined,
    }));
    events.push(result.event);
  }

  const blocked = events.find((event) => event.decision === "STOP_TOOL");
  const approval = events.find((event) => event.decision === "HUMAN_IN_THE_LOOP");
  const finalEvent = blocked ?? approval ?? events.at(-1);

  if (blocked) {
    const slashAmount = Number((agent.staked_usdc * 0.1).toFixed(2));
    const nextAgent: DemoAgentRow = {
      ...agent,
      reputation: Math.max(0, agent.reputation - 12),
      total_violations: agent.total_violations + 1,
      total_slashed: Number((agent.total_slashed + slashAmount).toFixed(2)),
      staked_usdc: Math.max(0, Number((agent.staked_usdc - slashAmount).toFixed(2))),
      status: "at-risk",
    };

    const [agentUpdate, violationInsert] = await Promise.all([
      supabase.from(AGENTS_TABLE).upsert(nextAgent).select("*").single<DemoAgentRow>(),
      supabase
        .from(VIOLATIONS_TABLE)
        .insert({
          agent_id: agent.id,
          agent_name: agent.name,
          agent_owner: agent.owner,
          reason: blocked.reason,
          severity: "high",
          slash_amount: slashAmount,
          tx_hash: blocked.evidenceHash,
        })
        .select("*")
        .single<DemoViolationRow>(),
    ]);

    if (agentUpdate.error) throw agentUpdate.error;
    if (violationInsert.error) throw violationInsert.error;
  }

  await updateState({
    wallet_connected: true,
    connected_wallet: owner,
    middleware_status: blocked ? "blocked" : approval ? "needs_approval" : "allowed",
    middleware_reason: finalEvent?.reason ?? "Market agent completed.",
    last_contract_tx_hash: finalEvent?.evidenceHash ?? null,
    last_action: "run_market_agent",
  });

  return events;
}

export async function GET() {
  try {
    const snapshot = await readSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error, "Failed to read demo flow state."),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: DemoAction;
      walletAddress?: string;
      agentAddress?: string;
      agentName?: string;
      category?: string;
      description?: string;
      policy?: string;
      stakeAmount?: number;
    };

    const action = body.action;

    if (!action) {
      return NextResponse.json({ ok: false, error: "Missing action." }, { status: 400 });
    }

    switch (action) {
      case "connect_wallet": {
        if (!body.walletAddress) {
          return NextResponse.json({ ok: false, error: "Missing walletAddress." }, { status: 400 });
        }

        await updateState({
          wallet_connected: true,
          connected_wallet: body.walletAddress,
          middleware_status: null,
          middleware_reason: null,
          last_action: "connect_wallet",
        });
        break;
      }
      case "disconnect_wallet": {
        await updateState({
          wallet_connected: false,
          connected_wallet: null,
          middleware_status: null,
          middleware_reason: null,
          last_contract_tx_hash: null,
          last_action: "disconnect_wallet",
        });
        break;
      }
      case "register_metatrader": {
        const state = await ensureDefaultState();
        const owner = body.walletAddress ?? state.connected_wallet;

        if (!owner) {
          return NextResponse.json(
            { ok: false, error: "Connect wallet before registration." },
            { status: 400 }
          );
        }

        await ensureMetaTraderRegistered(owner);
        await updateState({
          wallet_connected: true,
          connected_wallet: owner,
          middleware_status: "registered",
          middleware_reason: "MetaTrader AI staked 100 USDC",
          last_action: "register_metatrader",
        });
        break;
      }
      case "register_agent": {
        const state = await ensureDefaultState();
        const owner = body.walletAddress ?? state.connected_wallet;

        if (!owner) {
          return NextResponse.json(
            { ok: false, error: "Connect wallet before registration." },
            { status: 400 }
          );
        }

        if (!body.agentAddress || !body.agentName) {
          return NextResponse.json(
            { ok: false, error: "Missing agent address or name." },
            { status: 400 }
          );
        }

        await registerAgent({
          agentAddress: body.agentAddress,
          name: body.agentName,
          owner,
          category: body.category,
          description: body.description,
          policy: body.policy,
          stakeAmount: body.stakeAmount,
        });

        await updateState({
          wallet_connected: true,
          connected_wallet: owner,
          middleware_status: "registered",
          middleware_reason: `${body.agentName} registered`,
          last_action: "register_agent",
        });
        break;
      }
      case "run_safe_action": {
        await updateState({
          middleware_status: "allowed",
          middleware_reason: "safe_action_allowed",
          last_action: "run_safe_action",
        });
        break;
      }
      case "run_market_agent": {
        await runMarketAgent();
        break;
      }
      case "simulate_dangerous_action": {
        await simulateDangerousAction();
        break;
      }
      default: {
        return NextResponse.json({ ok: false, error: `Unsupported action: ${action}` }, { status: 400 });
      }
    }

    const snapshot = await readSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error, "Failed to update demo flow state."),
      },
      { status: 500 }
    );
  }
}
