import {
  AlertTriangle,
  BookOpen,
  Bot,
  DollarSign,
  FileWarning,
  Flame,
  Gauge,
  Info,
  Medal,
  UserPlus,
  Users,
} from "lucide-react";

import { Agent, NavItem, Stat, Transaction, Violation } from "@/lib/types";

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: Gauge },
  { title: "Agents", href: "/agents", icon: Bot },
  { title: "Register Agent", href: "/register", icon: UserPlus },
  { title: "Violations", href: "/violations", icon: FileWarning },
  { title: "Leaderboards", href: "/leaderboards", icon: Medal },
  { title: "About", href: "/about", icon: Info },
  { title: "Docs", href: "/docs", icon: BookOpen },
];

export const agents: Agent[] = [
  {
    address: "0x71C8469C9B12A31b8E745027F43d902C6dA2F4",
    name: "MetaTrader AI",
    owner: "0x0c9A8B125aB722A518C6d6f94714a52C8886b26A",
    reputation: 98,
    stakedUsdc: 500,
    violations: 0,
    status: "active",
    registeredAt: "2026-02-11 14:22 UTC",
    lastUpdated: "2026-05-14 07:15 UTC",
    summary: "Execution-focused agent with zero critical incidents across cross-market routing jobs.",
  },
  {
    address: "0x3B91dDF05033e7d9AE032144dbeB8d0837F7E8",
    name: "AlphaScout",
    owner: "0x8A71635231b629Ac247E4f828c4A034FE788718d",
    reputation: 92,
    stakedUsdc: 300,
    violations: 1,
    status: "active",
    registeredAt: "2026-03-04 09:10 UTC",
    lastUpdated: "2026-05-14 06:40 UTC",
    summary: "Signal discovery agent with strong precision and one medium-severity policy breach.",
  },
  {
    address: "0x8D12F4A0AeC4cD1df626Aa40d9CBFeF2BaC9A1",
    name: "NewsAnalytica",
    owner: "0x6fA5Aa968C86C536B49c44183eA9Dd12107dcC4D",
    reputation: 87,
    stakedUsdc: 250,
    violations: 2,
    status: "active",
    registeredAt: "2026-03-18 18:41 UTC",
    lastUpdated: "2026-05-14 05:33 UTC",
    summary: "Cross-chain sentiment agent with occasional suspicious traffic bursts.",
  },
  {
    address: "0x5F339Ad2bE187059cB71f482Fd2C3910d6BC11",
    name: "YieldMaxxer",
    owner: "0xA4B8d16Ea7be1196749C175b96A6D36cA63766AC",
    reputation: 75,
    stakedUsdc: 200,
    violations: 3,
    status: "at-risk",
    registeredAt: "2026-04-02 11:03 UTC",
    lastUpdated: "2026-05-14 04:08 UTC",
    summary: "Yield optimization agent with elevated policy and access risk.",
  },
  {
    address: "0x9A2A51A30c2f0EEdff2B84f74943c345ccDE55",
    name: "RiskBot",
    owner: "0xd91F36482A53d9A4C2d24fA2d2955bD5015e22f4",
    reputation: 42,
    stakedUsdc: 150,
    violations: 4,
    status: "slashed",
    registeredAt: "2026-04-20 16:26 UTC",
    lastUpdated: "2026-05-14 03:55 UTC",
    summary: "Compliance automation agent slashed after repeated prompt-injection attempts.",
  },
];

export const violations: Violation[] = [
  {
    id: "vio-001",
    agentAddress: agents[4].address,
    reason: "Attempted private-key exfiltration during delegated wallet task",
    severity: "high",
    reportedAt: "2m ago",
    txHash: "0x4a3c0fd51b92a6026b3a36d33da36c714e6a8d41501dA1f0a3a947B7b4f5ab92",
    slashAmount: 280,
  },
  {
    id: "vio-002",
    agentAddress: agents[3].address,
    reason: "Unauthorized data access pattern against restricted endpoint",
    severity: "medium",
    reportedAt: "15m ago",
    txHash: "0x67252c1eB4a95718C7eBefabC201a335Be944Af858D79a9dEF9b1ad3227a1029",
    slashAmount: 120,
  },
  {
    id: "vio-003",
    agentAddress: agents[2].address,
    reason: "Suspicious network burst after policy sandbox escalation",
    severity: "low",
    reportedAt: "1h ago",
    txHash: "0x8bB09F4d5200cD827183f2BCe8Ea15A2242a5f8A4CaB5d927147eE5a018e36a1",
    slashAmount: 35,
  },
  {
    id: "vio-004",
    agentAddress: agents[1].address,
    reason: "Medium policy violation in autonomous quoting workflow",
    severity: "medium",
    reportedAt: "3h ago",
    txHash: "0x27C33D063e071A2853cb563E66210EdAB721715a6eE8A7a5992325fb63F4291e",
    slashAmount: 90,
  },
  {
    id: "vio-005",
    agentAddress: agents[4].address,
    reason: "Attempted prompt injection against monitoring agent",
    severity: "high",
    reportedAt: "5h ago",
    txHash: "0xcB791029DBeF5e81b0EA993E0993b273B4Aa9D1dbBDe4731B5401eA528684a07",
    slashAmount: 240,
  },
];

export const transactions: Transaction[] = [
  { hash: violations[0].txHash, agentAddress: agents[4].address, type: "Slash", value: 280, time: "2m ago" },
  { hash: violations[1].txHash, agentAddress: agents[3].address, type: "Slash", value: 120, time: "15m ago" },
  { hash: "0x7d86b9b8dD55Ae58D95f7Bd1721F8f49ff51df4161e2a4E9C6D46Dd6d42bE8A7", agentAddress: agents[0].address, type: "Stake", value: 500, time: "1d ago" },
  { hash: "0xa309b6C070804e3f95CEa71582eA496E4168F006E5cF33a259a5280D59B3a475", agentAddress: agents[1].address, type: "Register", value: 300, time: "2d ago" },
];

export const dashboardStats: Stat[] = [
  { label: "Total Agents", value: "156", delta: "+12 this week", tone: "success", icon: Users },
  { label: "Total Staked", value: "15,230 USDC", delta: "+4.6% this month", usd: "$15,230.00", tone: "success", icon: DollarSign },
  { label: "Violations Reported", value: "342", delta: "+28 this week", tone: "warning", icon: AlertTriangle },
  { label: "Total Slashed", value: "2,816 USDC", delta: "+9.3% this month", usd: "$2,816.00", tone: "destructive", icon: Flame },
];

export function getAgentByAddress(address: string): Agent | undefined {
  const decoded = decodeURIComponent(address).toLowerCase();
  return agents.find((agent) => agent.address.toLowerCase() === decoded);
}

export function getAgentName(address: string): string {
  return agents.find((agent) => agent.address === address)?.name ?? "Unknown agent";
}
