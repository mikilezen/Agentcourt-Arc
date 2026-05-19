import { LucideIcon } from "lucide-react";

export type Severity = "low" | "medium" | "high";
export type AgentStatus = "active" | "at-risk" | "slashed";

export interface Agent {
  address: string;
  name: string;
  owner: string;
  reputation: number;
  stakedUsdc: number;
  violations: number;
  status: AgentStatus;
  registeredAt: string;
  lastUpdated: string;
  summary: string;
}

export interface Violation {
  id: string;
  agentAddress: string;
  agentName?: string;
  reason: string;
  severity: Severity;
  reportedAt: string;
  txHash: string;
  slashAmount: number;
}

export interface Transaction {
  hash: string;
  agentAddress: string;
  type: "Stake" | "Slash" | "Register" | "Appeal";
  value: number;
  time: string;
}

export interface Stat {
  label: string;
  value: string;
  delta?: string;
  usd?: string;
  tone: "success" | "warning" | "destructive" | "info";
  icon: LucideIcon;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}
