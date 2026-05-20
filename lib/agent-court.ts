"use client";

import { useMemo } from "react";
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Abi, type Address, type Hash, keccak256, toHex } from "viem";
import { AGENT_COURT_ABI } from "./abi";
import { arcTestnet } from "@/lib/chain";

export { AGENT_COURT_ABI };
export const ARC_TESTNET_CHAIN_ID = arcTestnet.id;

export type AgentCourtAddress = Address;
export type ViolationSeverity = 0 | 1 | 2;

export type AgentProfile = {
  owner: Address;
  metadataURI: string;
  stake: bigint;
  reputation: bigint;
  totalViolations: bigint;
  totalSlashed: bigint;
  status: number;
};

export type Violation = {
  violationType: string;
  severity: number;
  evidenceHash: Hash;
  slashAmount: bigint;
  timestamp: bigint;
};

type AgentProfileTuple = [Address, string, bigint, bigint, bigint, bigint, number];
type ViolationTuple = [string, number, Hash, bigint, bigint];

export type LeaderboardEntry = {
  agentId: bigint;
  profile: AgentProfile;
  rank: number;
};

type TxState = {
  txHash?: Hash;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
};

type HookAddressState = {
  address?: Address;
  error: Error | null;
};

function resolveContractAddress(address?: Address): HookAddressState {
  let resolved = address;
  if (!resolved && typeof window !== "undefined") {
    const stored = window.localStorage.getItem("agentcourt_contract_address");
    if (stored && stored.startsWith("0x")) {
      resolved = stored as Address;
    }
  }
  if (!resolved) {
    resolved = process.env.NEXT_PUBLIC_AGENT_COURT_ADDRESS as Address | undefined;
  }

  if (!resolved) {
    return {
      error: new Error("Missing AgentCourt address. Set NEXT_PUBLIC_AGENT_COURT_ADDRESS or pass address."),
    };
  }

  return { address: resolved, error: null };
}

function toHash(value: string): Hash {
  if (value.startsWith("0x") && value.length === 66) {
    return value as Hash;
  }

  return keccak256(toHex(value));
}

function normalizeAgentId(agentId: bigint | number) {
  return typeof agentId === "bigint" ? agentId : BigInt(agentId);
}

function toAgentProfile(tuple: AgentProfileTuple): AgentProfile {
  const [owner, metadataURI, stake, reputation, totalViolations, totalSlashed, status] = tuple;

  return {
    owner,
    metadataURI,
    stake,
    reputation,
    totalViolations,
    totalSlashed,
    status,
  };
}

export function useRegisterAgent(options?: { address?: Address }) {
  const { address, error: addressError } = resolveContractAddress(options?.address);
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const txError = addressError ?? write.error ?? receipt.error ?? null;
  const canWrite = Boolean(address);

  return {
    registerAgent: async (variables: { stakeAmount: bigint; metadataURI: string }) =>
      canWrite
            ? write.writeContractAsync({
            address: address as Address,
            abi: AGENT_COURT_ABI,
              chainId: arcTestnet.id,
            functionName: "registerAgent",
            args: [variables.stakeAmount, variables.metadataURI],
          })
        : Promise.reject(txError ?? new Error("Missing AgentCourt address.")),
    txHash: write.data,
    isPending: write.isPending || receipt.isLoading,
    isSuccess: receipt.isSuccess,
    isError: write.isError || receipt.isError,
    error: txError,
  } satisfies TxState & {
    registerAgent: (variables: { stakeAmount: bigint; metadataURI: string }) => Promise<Hash>;
  };
}

export function useReportViolation(options?: { address?: Address }) {
  const { address, error: addressError } = resolveContractAddress(options?.address);
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const txError = addressError ?? write.error ?? receipt.error ?? null;
  const canWrite = Boolean(address);

  return {
    reportViolation: async (variables: {
      agentId: bigint | number;
      violationType: string;
      severity: ViolationSeverity;
      evidenceHash: string;
    }) =>
      canWrite
            ? write.writeContractAsync({
            address: address as Address,
            abi: AGENT_COURT_ABI,
              chainId: arcTestnet.id,
            functionName: "reportViolation",
            args: [
              normalizeAgentId(variables.agentId),
              variables.violationType,
              variables.severity,
              toHash(variables.evidenceHash),
            ],
          })
        : Promise.reject(txError ?? new Error("Missing AgentCourt address.")),
    txHash: write.data,
    isPending: write.isPending || receipt.isLoading,
    isSuccess: receipt.isSuccess,
    isError: write.isError || receipt.isError,
    error: txError,
  } satisfies TxState & {
    reportViolation: (variables: {
      agentId: bigint | number;
      violationType: string;
      severity: ViolationSeverity;
      evidenceHash: string;
    }) => Promise<Hash>;
  };
}

export function useAgentProfile(options: { agentId?: bigint | number; address?: Address }) {
  const { address, error: addressError } = resolveContractAddress(options.address);
  const agentId = options.agentId === undefined ? undefined : normalizeAgentId(options.agentId);
  const canQuery = Boolean(address) && agentId !== undefined;

  const query = useReadContracts({
    allowFailure: false,
    contracts: canQuery ? [
      {
        address: address as Address,
        abi: AGENT_COURT_ABI,
        functionName: "getAgentProfile" as const,
        args: [agentId],
      },
    ] : [],
  });

  const profile = useMemo(() => {
    if (!query.data?.[0]) {
      return undefined;
    }

    return toAgentProfile(query.data[0] as AgentProfileTuple);
  }, [query.data]);

  return {
    data: profile,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: addressError ?? query.error ?? null,
  };
}

export function useAgentViolations(options: { agentId?: bigint | number; address?: Address }) {
  const { address, error: addressError } = resolveContractAddress(options.address);
  const agentId = options.agentId === undefined ? undefined : normalizeAgentId(options.agentId);
  const canQuery = Boolean(address) && agentId !== undefined;

  const countQuery = useReadContracts({
    allowFailure: false,
    contracts: canQuery ? [
      {
        address: address as Address,
        abi: AGENT_COURT_ABI,
        functionName: "getViolationCount" as const,
        args: [agentId],
      },
    ] : [],
  });

  const violationCount = countQuery.data?.[0] as bigint | undefined;

  const detailContracts =
    agentId === undefined || violationCount === undefined
      ? []
      : Array.from({ length: Number(violationCount) }, (_, index) => ({
          address: address as Address,
          abi: AGENT_COURT_ABI,
          functionName: "getViolation" as const,
          args: [agentId, BigInt(index)],
        }));

  const violationsQuery = useReadContracts({ allowFailure: true, contracts: detailContracts });

  const violations = useMemo(() => {
    return (violationsQuery.data ?? [])
      .flatMap((item) => (item.status === "success" ? [item.result as ViolationTuple] : []))
      .map((item) => {
        const [violationType, severity, evidenceHash, slashAmount, timestamp] = item;

        return {
          violationType,
          severity,
          evidenceHash,
          slashAmount,
          timestamp,
        } satisfies Violation;
      });
  }, [violationsQuery.data]);

  return {
    data: violations,
    violationCount: violationCount ?? BigInt(0),
    isLoading: countQuery.isLoading || violationsQuery.isLoading,
    isSuccess: countQuery.isSuccess && violationsQuery.isSuccess,
    isError: countQuery.isError || violationsQuery.isError,
    error: addressError ?? countQuery.error ?? violationsQuery.error ?? null,
  };
}

export function useAgentCourtStats(options: {
  address?: Address;
  agentIds?: readonly (bigint | number)[];
}) {
  const { address, error: addressError } = resolveContractAddress(options.address);
  const agentIds = options.agentIds?.map(normalizeAgentId) ?? [];
  const canQuery = Boolean(address) && agentIds.length > 0;

  const query = useReadContracts({
    allowFailure: true,
    contracts: canQuery
      ? agentIds.map((agentId) => ({
          address: address as Address,
          abi: AGENT_COURT_ABI,
          functionName: "getAgentProfile" as const,
          args: [agentId],
        }))
      : [],
  });

  const stats = useMemo(() => {
    const profiles = (query.data ?? []).flatMap((item) =>
      item.status === "success" ? [item.result as AgentProfileTuple] : []
    );

    const totalAgents = BigInt(profiles.length);
    const totalStaked = profiles.reduce((sum, profile) => sum + profile[2], BigInt(0));
    const totalViolations = profiles.reduce((sum, profile) => sum + profile[4], BigInt(0));
    const totalSlashed = profiles.reduce((sum, profile) => sum + profile[5], BigInt(0));
    const activeAgents = profiles.reduce(
      (sum, profile) => sum + BigInt(profile[6] === 1 ? 1 : 0),
      BigInt(0)
    );
    const averageReputation =
      totalAgents === BigInt(0)
        ? BigInt(0)
        : profiles.reduce((sum, profile) => sum + profile[3], BigInt(0)) / totalAgents;

    return {
      totalAgents,
      totalStaked,
      totalViolations,
      totalSlashed,
      activeAgents,
      averageReputation,
    };
  }, [query.data]);

  return {
    data: stats,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: addressError ?? query.error ?? null,
  };
}

export function useLeaderboard(options: {
  address?: Address;
  agentIds?: readonly (bigint | number)[];
  limit?: number;
}) {
  const { address, error: addressError } = resolveContractAddress(options.address);
  const agentIds = options.agentIds?.map(normalizeAgentId) ?? [];
  const canQuery = Boolean(address) && agentIds.length > 0;

  const query = useReadContracts({
    allowFailure: true,
    contracts: canQuery
      ? agentIds.map((agentId) => ({
          address: address as Address,
          abi: AGENT_COURT_ABI,
          functionName: "getAgentProfile" as const,
          args: [agentId],
        }))
      : [],
  });

  const leaderboard = useMemo(() => {
    const entries = (query.data ?? [])
      .map((item, index) => {
        if (!item || item.status !== "success") {
          return undefined;
        }

        const profile = toAgentProfile(item.result as AgentProfileTuple);
        const agentId = agentIds[index];

        if (agentId === undefined) {
          return undefined;
        }

        return {
          agentId,
          profile,
          rank: 0,
        } satisfies LeaderboardEntry;
      })
      .filter((entry): entry is LeaderboardEntry => Boolean(entry));

    return entries
      .sort((left, right) => {
        const reputationDelta = Number(right.profile.reputation - left.profile.reputation);
        if (reputationDelta !== 0) {
          return reputationDelta;
        }

        const stakeDelta = Number(right.profile.stake - left.profile.stake);
        if (stakeDelta !== 0) {
          return stakeDelta;
        }

        return Number(left.agentId - right.agentId);
      })
      .slice(0, options.limit ?? entries.length)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  }, [agentIds, options.limit, query.data]);

  return {
    data: leaderboard,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: addressError ?? query.error ?? null,
  };
}
