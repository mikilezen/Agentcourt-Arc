import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { AgentCourtOrchestrator, hashEvidence } from "@/lib/agentcourt-orchestration-sdk";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toolCallSchema } from "@/lib/validation/schemas";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const AGENTS_TABLE = "agentcourt_demo_agents";
const VIOLATIONS_TABLE = "agentcourt_demo_violations";

type GatewayOnChainProfile = {
  status?: string;
  owner?: string;
  stake?: number;
  reputation?: number;
  totalViolations?: number;
  totalSlashed?: number;
  onChainStatus?: number | string;
  rawStatusCode?: number;
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

function normalizeTrustLevel(trustLevel?: string): "verified" | "unverified" {
  return trustLevel === "verified" ? "verified" : "unverified";
}

function resolveAgentStatus(profile?: GatewayOnChainProfile): "active" | "at-risk" | "slashed" {
  if (!profile) {
    return "active";
  }

  if (profile.onChainStatus === 2 || profile.onChainStatus === "Slashed") {
    return "slashed";
  }

  if (profile.rawStatusCode === 2) {
    return "slashed";
  }

  return "active";
}

function extractAmount(args?: Record<string, unknown>) {
  const value = args?.amountUsd ?? args?.notionalUsd ?? 0;
  return typeof value === "number" ? value : Number(value) || 0;
}

function verdictFromDecision(decision: string) {
  if (decision === "ALLOW") return "ALLOW";
  if (decision === "HUMAN_IN_THE_LOOP") return "ESCALATE";
  return "DENY";
}

function buildTrustScore(profile?: GatewayOnChainProfile) {
  const reputation = Math.max(0, Math.min(100, profile?.reputation ?? 100));
  const stake = Math.max(0, profile?.stake ?? 0);
  const violations = Math.max(0, profile?.totalViolations ?? 0);

  const reputationComponent = reputation / 100;
  const stakeComponent = Math.min(1, stake / 10000);
  const historyComponent = 1 - Math.min(1, violations / (violations + 10));
  const overall = Number(
    (reputationComponent * 0.4 + stakeComponent * 0.3 + historyComponent * 0.3).toFixed(3)
  );

  return {
    overall,
    reputationComponent,
    stakeComponent,
    historyComponent,
    formula: "(rep*0.4 + stake*0.3 + history*0.3)",
    computedAt: new Date().toISOString(),
  };
}

function buildRiskAssessment(args?: Record<string, unknown>) {
  const amount = extractAmount(args);
  const maxTradeUsd = 2500;
  const amountRatio = Math.min(1, amount / maxTradeUsd);

  return {
    score: Number(amountRatio.toFixed(2)),
    amountRatio: Number(amountRatio.toFixed(2)),
    sensitivityMultiplier: 1,
    violationDecay: 1,
  };
}

export async function POST(request: Request) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const rl = rateLimit(`toolcall:${ip}`, RATE_LIMITS.write);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Auth required — wallet address from middleware JWT
    const walletAddress = request.headers.get("x-wallet-address");
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Authentication required. Connect wallet and sign in." },
        { status: 401 }
      );
    }

    const rawBody = await request.json();

    // Validate input with Zod
    const parseResult = toolCallSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const agentInput = body.agent;
    const tool = body.tool;
    const args = body.args ?? {};

    const owner = agentInput.ownerAddress ?? agentInput.owner ?? walletAddress;
    const passport = {
      issuer: agentInput.passport?.issuer ?? "agentcourt-gateway",
      trustLevel: normalizeTrustLevel(agentInput.passport?.trustLevel),
      issuedAt: agentInput.passport?.issuedAt ?? new Date().toISOString(),
    };

    const agent = {
      id: agentInput.id,
      name: agentInput.name,
      owner,
      strategy: agentInput.strategy ?? "agentcourt-sdk",
      passport,
    };

    const orchestrator = new AgentCourtOrchestrator();
    const profile = agentInput.onChainProfile;
    const onChainSlashed =
      profile?.onChainStatus === 2 || profile?.onChainStatus === "Slashed" || profile?.rawStatusCode === 2;
    const event = await orchestrator.evaluate(agent, tool, args, Boolean(onChainSlashed));

    const verdict = verdictFromDecision(event.decision);
    if (verdict === "ALLOW" && agent.owner) {
      const amount = extractAmount(args);
      const currentDailySpend = await orchestrator.getDailySpend(agent.owner);
      await orchestrator.setDailySpend(agent.owner, currentDailySpend + amount);
    }

    const evidenceHash = event.evidenceHash ?? hashEvidence({ agent: agent.id, tool, args, verdict, reason: event.reason });
    const toolCallEvent = {
      id: event.id ?? `evt_${randomUUID()}`,
      agent: {
        id: agent.id,
        name: agent.name,
        owner,
        ownerAddress: agentInput.ownerAddress ?? agentInput.owner,
        strategy: agent.strategy,
        passport,
      },
      tool,
      args,
      verdict,
      reason: event.reason,
      trustScore: buildTrustScore(profile),
      riskAssessment: buildRiskAssessment(args),
      evidenceHash,
      latencyMs: event.latencyMs ?? 0,
      createdAt: event.createdAt ?? new Date().toISOString(),
      findings: verdict === "DENY" ? [event.reason] : [],
    };

    const supabase = getSupabaseServerClient();
    const existing = await supabase
      .from(AGENTS_TABLE)
      .select("*")
      .eq("id", agent.id)
      .maybeSingle<DemoAgentRow>();

    if (existing.error) {
      throw existing.error;
    }

    const baseViolations = profile?.totalViolations ?? existing.data?.total_violations ?? 0;
    const baseSlashed = profile?.totalSlashed ?? existing.data?.total_slashed ?? 0;
    const nextStatus = resolveAgentStatus(profile);
    const nextViolations =
      verdict === "DENY" && profile?.status !== "verified" ? baseViolations + 1 : baseViolations;

    const nextAgent: DemoAgentRow = {
      id: agent.id,
      name: agent.name,
      owner,
      category: existing.data?.category ?? null,
      description: agent.strategy ?? existing.data?.description ?? null,
      policy: existing.data?.policy ?? null,
      reputation: profile?.reputation ?? existing.data?.reputation ?? 100,
      staked_usdc: profile?.stake ?? existing.data?.staked_usdc ?? 0,
      total_violations: nextViolations,
      total_slashed: baseSlashed,
      status: verdict === "DENY" && nextStatus !== "slashed" ? "at-risk" : nextStatus,
    };

    const agentUpsert = await supabase.from(AGENTS_TABLE).upsert(nextAgent).select("*").single<DemoAgentRow>();
    if (agentUpsert.error) {
      throw agentUpsert.error;
    }

    if (verdict === "DENY") {
      const severity = event.reason.toLowerCase().includes("sensitive") ? "high" : "medium";
      const violationInsert = await supabase
        .from(VIOLATIONS_TABLE)
        .insert({
          agent_id: agent.id,
          agent_name: agent.name,
          agent_owner: owner,
          reason: event.reason,
          severity,
          slash_amount: 0,
          tx_hash: evidenceHash,
        })
        .select("*")
        .single();

      if (violationInsert.error) {
        throw violationInsert.error;
      }
    }

    return NextResponse.json(toolCallEvent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to evaluate tool call.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
