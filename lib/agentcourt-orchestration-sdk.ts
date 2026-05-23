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

  constructor(
    private readonly policy: AgentCourtPolicy = AGENTCOURT_AGORA_POLICY,
    private readonly rpcUrl: string = "https://rpc.testnet.arc.network",
    private readonly contractAddress: string = process.env.NEXT_PUBLIC_AGENT_COURT_ADDRESS || "0x1a6389aa779BD3C01B7867bB76a9B51f283f9B3a"
  ) {}

  /**
   * Low-dependency JSON-RPC client over fetch
   */
  async ethCall(to: string, data: string): Promise<string> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_call",
          params: [
            { to, data },
            "latest"
          ]
        })
      });
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.result;
    } catch (error: any) {
      throw new Error(`RPC Connection failed: ${error.message}`);
    }
  }

  /**
   * Reads profile on-chain from the AgentCourt smart contract registry
   */
  async queryOnChainProfile(ownerAddress: string) {
    if (!ownerAddress || !ownerAddress.startsWith("0x")) {
      return { status: "simulated" as const, reason: "Invalid owner address" };
    }

    try {
      // 1. Get Agent ID of Owner
      const addressClean = ownerAddress.slice(2).toLowerCase();
      const agentIdData = `0xb3631cc9` + addressClean.padStart(64, "0");
      const agentIdHex = await this.ethCall(this.contractAddress, agentIdData);
      
      if (!agentIdHex || agentIdHex === "0x" || /^0x0*$/.test(agentIdHex)) {
        return { status: "unregistered" as const, id: 0 };
      }
      
      const agentId = parseInt(agentIdHex, 16);
      
      // 2. Get Agent Profile from ID
      const profileData = `0x16b06387` + agentId.toString(16).padStart(64, "0");
      const profileHex = await this.ethCall(this.contractAddress, profileData);

      if (!profileHex || profileHex === "0x") {
        return { status: "unregistered" as const, id: agentId };
      }

      const dataHex = profileHex.startsWith("0x") ? profileHex.slice(2) : profileHex;
      const ownerHex = "0x" + dataHex.substring(24, 64);
      const stake = BigInt("0x" + dataHex.substring(128, 192));
      const reputation = parseInt(dataHex.substring(192, 256), 16);
      const totalViolations = parseInt(dataHex.substring(256, 320), 16);
      const totalSlashed = BigInt("0x" + dataHex.substring(320, 384));
      const statusCode = parseInt(dataHex.substring(384, 448), 16);

      const statuses = ["None", "Active", "Slashed"];
      const status = statuses[statusCode] || "Unknown";

      return {
        status: "verified" as const,
        id: agentId,
        owner: ownerHex,
        stake: Number(stake) / 1e6, // USDC decimals
        reputation,
        totalViolations,
        totalSlashed: Number(totalSlashed) / 1e6,
        onChainStatus: status,
        rawStatusCode: statusCode
      };
    } catch (error: any) {
      return {
        status: "sandbox" as const,
        error: error.message
      };
    }
  }

  async callTool(
    agent: AgentCourtAgent,
    tool: string,
    args: Record<string, unknown>,
    execute?: () => Promise<unknown> | unknown
  ) {
    // Check status on-chain
    let onChainSlashed = false;
    if (agent.owner) {
      const profile = await this.queryOnChainProfile(agent.owner);
      if (profile.status === "verified" && profile.onChainStatus === "Slashed") {
        onChainSlashed = true;
      }
    }

    const event = this.evaluate(agent, tool, args, onChainSlashed);

    if (event.decision !== "ALLOW") {
      return { event, result: null };
    }

    const amount = amountFromArgs(args);
    this.dailySpendUsd += amount;
    const result = execute ? await execute() : { accepted: true };
    return { event, result };
  }

  evaluate(
    agent: AgentCourtAgent, 
    tool: string, 
    args: Record<string, unknown>,
    onChainSlashed: boolean = false
  ): ToolCallEvent {
    const started = performance.now();
    const amount = amountFromArgs(args);
    const sensitiveFindings = findSensitiveValues(this.policy, args);
    let decision: ToolDecision = "ALLOW";
    let reason = "Policy checks passed.";

    if (onChainSlashed) {
      decision = "STOP_TOOL";
      reason = "Agent status on-chain is Slashed. Tool calls permanently frozen.";
    } else if (!this.policy.allowedTools.includes(tool)) {
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
