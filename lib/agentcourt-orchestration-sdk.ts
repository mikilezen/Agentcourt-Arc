import { createHash } from "crypto";

export type AgentCourtPassport = {
  issuer: string;
  trustLevel: "verified" | "unverified";
  issuedAt: string;
};

export type AgentCourtAgent = {
  id: string;
  name: string;
  owner: string;
  strategy: string;
  passport: AgentCourtPassport;
};

export type ToolDecision = "ALLOW" | "STOP_TOOL" | "HUMAN_IN_THE_LOOP";

export type ToolCallEvent = {
  id: string;
  agent: AgentCourtAgent;
  tool: string;
  args: Record<string, unknown>;
  decision: ToolDecision;
  reason: string;
  evidenceHash: string;
  latencyMs: number;
  createdAt: string;
};

export type AgentCourtPolicy = {
  maxTradeUsd: number;
  maxDailyUsd: number;
  allowedTools: string[];
  humanApprovalTools: string[];
  sensitivePatterns: Array<{ name: string; pattern: string }>;
};

export const AGENTCOURT_AGORA_POLICY: AgentCourtPolicy = {
  maxTradeUsd: 2500,
  maxDailyUsd: 10000,
  allowedTools: [
    "market.read",
    "risk.score",
    "arc.quote",
    "arc.transfer_usdc",
    "arc.publish_trace",
  ],
  humanApprovalTools: ["arc.transfer_usdc"],
  sensitivePatterns: [
    { name: "private key", pattern: "private[_ -]?key|seed phrase|mnemonic" },
    { name: "phone", pattern: "\\+?\\d[\\d\\s().-]{7,}\\d" },
    { name: "email", pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}" },
  ],
};

export class AgentCourtOrchestrator {
  private dailySpendUsd = 0;

  constructor(private readonly policy: AgentCourtPolicy = AGENTCOURT_AGORA_POLICY) {}

  async callTool(
    agent: AgentCourtAgent,
    tool: string,
    args: Record<string, unknown>,
    execute?: () => Promise<unknown> | unknown
  ) {
    const event = this.evaluate(agent, tool, args);

    if (event.decision !== "ALLOW") {
      return { event, result: null };
    }

    const amount = amountFromArgs(args);
    this.dailySpendUsd += amount;
    const result = execute ? await execute() : { accepted: true };
    return { event, result };
  }

  evaluate(agent: AgentCourtAgent, tool: string, args: Record<string, unknown>): ToolCallEvent {
    const started = performance.now();
    const amount = amountFromArgs(args);
    const sensitiveFindings = findSensitiveValues(this.policy, args);
    let decision: ToolDecision = "ALLOW";
    let reason = "Policy checks passed.";

    if (!this.policy.allowedTools.includes(tool)) {
      decision = "STOP_TOOL";
      reason = "Tool is not allowlisted for this agent.";
    } else if (agent.passport.trustLevel !== "verified") {
      decision = "STOP_TOOL";
      reason = "Agent passport is missing or unverified.";
    } else if (sensitiveFindings.length > 0) {
      decision = "STOP_TOOL";
      reason = `Sensitive data detected: ${sensitiveFindings.join(", ")}.`;
    } else if (amount > this.policy.maxTradeUsd) {
      decision = "HUMAN_IN_THE_LOOP";
      reason = `Trade exceeds per-action limit of ${this.policy.maxTradeUsd} USDC.`;
    } else if (this.dailySpendUsd + amount > this.policy.maxDailyUsd) {
      decision = "HUMAN_IN_THE_LOOP";
      reason = `Run would exceed daily budget of ${this.policy.maxDailyUsd} USDC.`;
    } else if (this.policy.humanApprovalTools.includes(tool) && amount > 1000) {
      decision = "HUMAN_IN_THE_LOOP";
      reason = "High-value Arc settlement requires operator approval.";
    }

    const evidenceHash = hashEvidence({ agentId: agent.id, tool, args, decision, reason });

    return {
      id: `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      agent,
      tool,
      args,
      decision,
      reason,
      evidenceHash,
      latencyMs: Number((performance.now() - started).toFixed(2)),
      createdAt: new Date().toISOString(),
    };
  }
}

export function createVerifiedAgent(input: Omit<AgentCourtAgent, "passport">): AgentCourtAgent {
  return {
    ...input,
    passport: {
      issuer: "agentcourt-arc",
      trustLevel: "verified",
      issuedAt: new Date().toISOString(),
    },
  };
}

export function hashEvidence(value: unknown) {
  return `0x${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function amountFromArgs(args: Record<string, unknown>) {
  const value = args.amountUsd ?? args.notionalUsd ?? 0;
  return typeof value === "number" ? value : Number(value) || 0;
}

function findSensitiveValues(policy: AgentCourtPolicy, value: Record<string, unknown>) {
  const raw = JSON.stringify(value ?? {});

  return policy.sensitivePatterns
    .map((item) => ({ ...item, regex: new RegExp(item.pattern, "i") }))
    .filter((item) => item.regex.test(raw))
    .map((item) => item.name);
}
