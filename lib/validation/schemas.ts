import { z } from "zod";

const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format.");

export const registerAgentSchema = z.object({
  agentAddress: ethereumAddress,
  agentName: z.string().min(2, "Name must be at least 2 characters.").max(64, "Name must be at most 64 characters."),
  category: z.string().max(32, "Category must be at most 32 characters.").optional().default(""),
  description: z.string().max(500, "Description must be at most 500 characters.").optional().default(""),
  policy: z.string().max(200, "Policy must be at most 200 characters.").optional().default(""),
  stakeAmount: z.number().positive("Stake must be positive.").max(1_000_000, "Stake exceeds maximum.").optional(),
});

export const toolCallSchema = z.object({
  agent: z.object({
    id: z.string().min(1, "Agent ID is required."),
    name: z.string().min(1, "Agent name is required."),
    owner: z.string().optional(),
    ownerAddress: z.string().optional(),
    strategy: z.string().optional(),
    passport: z.object({
      issuer: z.string().optional(),
      trustLevel: z.enum(["verified", "unverified"]).optional(),
      issuedAt: z.string().optional(),
    }).optional(),
    onChainProfile: z.object({
      status: z.string().optional(),
      owner: z.string().optional(),
      stake: z.number().optional(),
      reputation: z.number().optional(),
      totalViolations: z.number().optional(),
      totalSlashed: z.number().optional(),
      onChainStatus: z.union([z.number(), z.string()]).optional(),
      rawStatusCode: z.number().optional(),
    }).optional(),
  }),
  tool: z.string().min(1, "Tool name is required.").max(64),
  args: z.record(z.string(), z.unknown()).optional().default({}),
});

export const demoActionSchema = z.object({
  action: z.enum([
    "register_agent",
    "register_metatrader",
    "run_safe_action",
    "run_market_agent",
    "simulate_dangerous_action",
  ]),
  walletAddress: ethereumAddress.optional(),
  agentAddress: ethereumAddress.optional(),
  agentName: z.string().max(64).optional(),
  category: z.string().max(32).optional(),
  description: z.string().max(500).optional(),
  policy: z.string().max(200).optional(),
  stakeAmount: z.number().positive().max(1_000_000).optional(),
});
