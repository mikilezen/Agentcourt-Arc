import { type Abi } from "viem";
import agentCourtAbiJson from "@/lib/abi/AgentCourt.json";

export const AGENT_COURT_ABI = (
  Array.isArray(agentCourtAbiJson)
    ? agentCourtAbiJson
    : (agentCourtAbiJson as any).default || []
) as Abi;
