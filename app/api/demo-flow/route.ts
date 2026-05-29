import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import {
  AgentCourtOrchestrator,
  createVerifiedAgent,
} from "@/lib/agentcourt-orchestration-sdk";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { demoActionSchema, registerAgentSchema } from "@/lib/validation/schemas";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const STATE_TABLE = "agentcourt_demo_state";
const AGENTS_TABLE = "agentcourt_demo_agents";
const VIOLATIONS_TABLE = "agentcourt_demo_violations";

const METATRADER_AGENT_ID = "metatrader-ai";
const HIGH_SLASH_RATE = 0.2;
const HIGH_REPUTATION_PENALTY = 20;

type DemoAction =
  | "register_agent"
  | "register_metatrader"
  | "run_safe_action"
  | "run_market_agent"
  | "simulate_dangerous_action";

type DemoStateRow = {
  id: string;
  wallet_address?: string | null;
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

let stateSupportsWalletAddressColumn: boolean | null = null;

function isMissingWalletAddressColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  const message = "message" in error ? (error as { message?: unknown }).message : undefined;

  return (
    code === "PGRST204" &&
    typeof message === "string" &&
    message.includes("wallet_address")
  );
}

function toStateUpsertPayload(state: DemoStateRow) {
  if (stateSupportsWalletAddressColumn === false) {
    const { wallet_address: _unused, ...legacyState } = state;
    return legacyState;
  }

  return state;
}

function normalizeStateRow(row: DemoStateRow, walletAddress: string): DemoStateRow {
  const normalized = walletAddress.toLowerCase();

  return {
    ...row,
    id: row.id || normalized,
    wallet_address:
      typeof row.wallet_address === "string" ? row.wallet_address : normalized,
    connected_wallet:
      typeof row.connected_wallet === "string" ? row.connected_wallet : walletAddress,
    wallet_connected: Boolean(row.wallet_connected),
  };
}

async function upsertStateRow(supabase: ReturnType<typeof getSupabaseServerClient>, next: DemoStateRow) {
  const attempt = await supabase
    .from(STATE_TABLE)
    .upsert(toStateUpsertPayload(next))
    .select("*")
    .single<DemoStateRow>();

  if (attempt.error && isMissingWalletAddressColumnError(attempt.error)) {
    stateSupportsWalletAddressColumn = false;

    const retry = await supabase
      .from(STATE_TABLE)
      .upsert(toStateUpsertPayload(next))
      .select("*")
      .single<DemoStateRow>();

    if (retry.error) {
      throw retry.error;
    }

    return normalizeStateRow(retry.data, next.connected_wallet ?? next.id);
  }

  if (attempt.error) {
    throw attempt.error;
  }

  stateSupportsWalletAddressColumn = true;
  return normalizeStateRow(attempt.data, next.connected_wallet ?? next.id);
}

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

function defaultState(walletAddress: string): DemoStateRow {
  return {
    id: walletAddress.toLowerCase(),
    wallet_address: walletAddress.toLowerCase(),
    connected_wallet: walletAddress,
    wallet_connected: true,
    middleware_status: null,
    middleware_reason: null,
    last_contract_tx_hash: null,
    last_action: null,
  };
}

/**
 * Get the authenticated wallet address from the middleware-injected header.
 * Returns null for unauthenticated requests (e.g., GET).
 */
function getAuthenticatedWallet(request: Request): string | null {
  return request.headers.get("x-wallet-address");
}

async function ensureWalletState(walletAddress: string): Promise<DemoStateRow> {
  const supabase = getSupabaseServerClient();
  const normalized = walletAddress.toLowerCase();

  const current = await supabase
    .from(STATE_TABLE)
    .select("*")
    .eq("id", normalized)
    .maybeSingle<DemoStateRow>();

  if (current.error) {
    throw current.error;
  }

  if (!current.data) {
    return upsertStateRow(supabase, defaultState(walletAddress));
  }

  return normalizeStateRow(current.data, walletAddress);
}

async function readSnapshot(walletAddress?: string | null): Promise<Snapshot> {
  const supabase = getSupabaseServerClient();

  // Use per-wallet state if authenticated, otherwise return a default empty state
  let state: DemoStateRow;
  if (walletAddress) {
    state = await ensureWalletState(walletAddress);
  } else {
    state = {
      id: "public",
      wallet_address: null,
      connected_wallet: null,
      wallet_connected: false,
      middleware_status: null,
      middleware_reason: null,
      last_contract_tx_hash: null,
      last_action: null,
    };
  }

  let agentsQuery = supabase
    .from(AGENTS_TABLE)
    .select("*")
    .order("reputation", { ascending: false });

  let violationsQuery = supabase
    .from(VIOLATIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (walletAddress) {
    const normalized = walletAddress.toLowerCase();
    agentsQuery = agentsQuery.eq("owner", normalized);
    violationsQuery = violationsQuery.eq("agent_owner", normalized);
  }

  const [agentsResult, violationsResult] = await Promise.all([
    agentsQuery.returns<DemoAgentRow[]>(),
    violationsQuery.returns<DemoViolationRow[]>(),
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

async function updateState(walletAddress: string, patch: Partial<DemoStateRow>) {
  const supabase = getSupabaseServerClient();
  const current = await ensureWalletState(walletAddress);
  const normalized = walletAddress.toLowerCase();

  const next: DemoStateRow = {
    ...current,
    ...patch,
    id: normalized,
    wallet_address: normalized,
  };

  return upsertStateRow(supabase, next);
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

  if (existing.data) {
    throw new Error("An agent with that address already exists. Use a new agent address to register another agent.");
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

  const inserted = await supabase.from(AGENTS_TABLE).insert(nextAgent).select("*").single<DemoAgentRow>();
  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data;
}

async function simulateDangerousAction(walletAddress: string) {
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

  await updateState(walletAddress, {
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

async function runMarketAgent(walletAddress: string) {
  const supabase = getSupabaseServerClient();
  const owner = walletAddress;
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

  await updateState(walletAddress, {
    wallet_connected: true,
    connected_wallet: owner,
    middleware_status: blocked ? "blocked" : approval ? "needs_approval" : "allowed",
    middleware_reason: finalEvent?.reason ?? "Market agent completed.",
    last_contract_tx_hash: finalEvent?.evidenceHash ?? null,
    last_action: "run_market_agent",
  });

  return events;
}

export async function GET(request: Request) {
  try {
    // Rate limit reads
    const ip = getClientIp(request);
    const rl = rateLimit(`read:${ip}`, RATE_LIMITS.read);
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // GET is public — no auth required
    const walletAddress = getAuthenticatedWallet(request);
    const snapshot = await readSnapshot(walletAddress);
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
    // Rate limit writes
    const ip = getClientIp(request);
    const rl = rateLimit(`write:${ip}`, RATE_LIMITS.write);
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Auth required for POST — wallet address comes from middleware JWT
    const walletAddress = getAuthenticatedWallet(request);
    if (!walletAddress) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Connect wallet and sign in." },
        { status: 401 }
      );
    }

    const rawBody = await request.json();

    // Validate input with Zod
    const parseResult = demoActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: parseResult.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const action = body.action;

    switch (action) {
      case "register_metatrader": {
        await ensureMetaTraderRegistered(walletAddress);
        await updateState(walletAddress, {
          wallet_connected: true,
          connected_wallet: walletAddress,
          middleware_status: "registered",
          middleware_reason: "MetaTrader AI staked 100 USDC",
          last_action: "register_metatrader",
        });
        break;
      }
      case "register_agent": {
        if (!body.agentAddress || !body.agentName) {
          return NextResponse.json(
            { ok: false, error: "Missing agent address or name." },
            { status: 400 }
          );
        }

        // Additional validation for register_agent fields
        const agentParse = registerAgentSchema.safeParse({
          agentAddress: body.agentAddress,
          agentName: body.agentName,
          category: body.category,
          description: body.description,
          policy: body.policy,
          stakeAmount: body.stakeAmount,
        });

        if (!agentParse.success) {
          return NextResponse.json(
            { ok: false, error: agentParse.error.issues[0]?.message ?? "Invalid agent data." },
            { status: 400 }
          );
        }

        await registerAgent({
          agentAddress: body.agentAddress,
          name: body.agentName,
          owner: walletAddress,
          category: body.category,
          description: body.description,
          policy: body.policy,
          stakeAmount: body.stakeAmount,
        });

        await updateState(walletAddress, {
          wallet_connected: true,
          connected_wallet: walletAddress,
          middleware_status: "registered",
          middleware_reason: `${body.agentName} registered`,
          last_action: "register_agent",
        });
        break;
      }
      case "run_safe_action": {
        await updateState(walletAddress, {
          middleware_status: "allowed",
          middleware_reason: "safe_action_allowed",
          last_action: "run_safe_action",
        });
        break;
      }
      case "run_market_agent": {
        await runMarketAgent(walletAddress);
        break;
      }
      case "simulate_dangerous_action": {
        await simulateDangerousAction(walletAddress);
        break;
      }
      default: {
        return NextResponse.json({ ok: false, error: `Unsupported action: ${action}` }, { status: 400 });
      }
    }

    const snapshot = await readSnapshot(walletAddress);
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
