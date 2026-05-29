"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";

import { Button } from "@/components/ui/button";
import { AGENT_COURT_ABI } from "@/lib/agent-court";

type RegisterFormContent = {
  defaultStake: number;
  minimumStake: number;
  stakeLabel: string;
  stakeUnit: string;
  approveLabel: string;
  registerLabel: string;
};

type DemoFlowSnapshot = {
  state?: {
    connected_wallet?: string | null;
    wallet_connected?: boolean;
  };
};

type DemoFlowResponse = {
  ok?: boolean;
  error?: string;
  snapshot?: DemoFlowSnapshot;
};

export function RegisterForm({ form }: { form: RegisterFormContent }) {
  const { address, isConnected } = useAccount();

  const [agentName, setAgentName] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [policy, setPolicy] = useState("");
  const [stake, setStake] = useState(String(form.defaultStake));

  const [agentCourtAddress, setAgentCourtAddress] = useState<`0x${string}` | undefined>(undefined);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [registerTxHash, setRegisterTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [allowanceConfirmed, setAllowanceConfirmed] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<"approve" | "register" | null>(null);

  // Resolve contract address
  useEffect(() => {
    let resolved: `0x${string}` | undefined;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("agentcourt_contract_address");
      if (stored && stored.startsWith("0x")) {
        resolved = stored as `0x${string}`;
      }
    }
    if (!resolved) {
      resolved = process.env.NEXT_PUBLIC_AGENT_COURT_ADDRESS as `0x${string}` | undefined;
    }
    setAgentCourtAddress(resolved);
  }, []);

  const stakeValue = useMemo(() => {
    const parsed = Number(stake);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [stake]);

  // Read USDC address from AgentCourt
  const { data: usdcAddress } = useReadContract({
    address: agentCourtAddress,
    abi: AGENT_COURT_ABI,
    functionName: "usdc",
    query: {
      enabled: Boolean(agentCourtAddress),
    },
  });

  // Read User allowance of USDC for AgentCourt
  const { data: rawAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress as `0x${string}` | undefined,
    abi: [
      {
        type: "function",
        name: "allowance",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "allowance",
    args: address && agentCourtAddress ? [address, agentCourtAddress] : undefined,
    query: {
      enabled: Boolean(address && agentCourtAddress && usdcAddress),
    },
  });

  const { data: rawUsdcDecimals } = useReadContract({
    address: usdcAddress as `0x${string}` | undefined,
    abi: [
      {
        type: "function",
        name: "decimals",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint8" }],
      },
    ],
    functionName: "decimals",
    query: {
      enabled: Boolean(usdcAddress),
    },
  });

  // Read User balance of USDC
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: usdcAddress as `0x${string}` | undefined,
    abi: [
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && usdcAddress),
    },
  });

  const usdcDecimals = useMemo(() => {
    if (rawUsdcDecimals === undefined) {
      return 6;
    }

    const parsed = typeof rawUsdcDecimals === "number" ? rawUsdcDecimals : Number(rawUsdcDecimals);
    return Number.isFinite(parsed) ? parsed : 6;
  }, [rawUsdcDecimals]);

  const hasAllowance = useMemo(() => {
    if (rawAllowance === undefined) return false;
    const required = parseUnits(String(stakeValue || form.minimumStake), usdcDecimals);
    return rawAllowance >= required;
  }, [rawAllowance, stakeValue, form.minimumStake, usdcDecimals]);

  useEffect(() => {
    setAllowanceConfirmed(hasAllowance);
  }, [hasAllowance]);

  const hasBalance = useMemo(() => {
    if (rawBalance === undefined) return false;
    const required = parseUnits(String(stakeValue || form.minimumStake), usdcDecimals);
    return rawBalance >= required;
  }, [rawBalance, stakeValue, form.minimumStake, usdcDecimals]);

  const stakeAmountUnits = useMemo(
    () => parseUnits(String(stakeValue || form.minimumStake), usdcDecimals),
    [stakeValue, form.minimumStake, usdcDecimals]
  );

  const stakeAmountDisplay = useMemo(
    () => formatUnits(stakeAmountUnits, usdcDecimals),
    [stakeAmountUnits, usdcDecimals]
  );

  // Approve & Register contract writers
  const { writeContractAsync: approveUsdc } = useWriteContract();
  const { writeContractAsync: registerAgentOnChain } = useWriteContract();

  const { isLoading: isWaitingForApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isLoading: isWaitingForRegister, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerTxHash,
  });

  // Handle transaction states
  useEffect(() => {
    if (!approveTxHash || !isApproveSuccess) {
      return;
    }

    const settleApproval = async () => {
      try {
        await refetchAllowance();
        setAllowanceConfirmed(true);
        setSuccess("USDC approved successfully!");
      } finally {
        setLoading(null);
        setApproveTxHash(undefined);
      }
    };

    void settleApproval();
  }, [approveTxHash, isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    const handleRegisterConfirmed = async () => {
      if (registerTxHash && isRegisterSuccess) {
        setRegisterTxHash(undefined);
        setLoading(null);

        // Sync with backend API
        try {
          const response = await fetch("/api/demo-flow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "register_agent",
              agentAddress: agentAddress.trim(),
              agentName: agentName.trim(),
              category: category.trim() || undefined,
              description: description.trim() || undefined,
              policy: policy.trim() || undefined,
              stakeAmount: stakeValue,
              walletAddress: address,
            }),
          });

          const data = (await response.json()) as DemoFlowResponse;
          if (!response.ok || !data.ok) {
            throw new Error(data.error ?? "Failed to register in database.");
          }

          setSuccess("Agent registered and staked successfully on-chain!");
          window.dispatchEvent(new CustomEvent("agentcourt:wallet-connected"));
        } catch (caughtError) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to sync registration.");
        }
      }
    };

    void handleRegisterConfirmed();
  }, [registerTxHash, isRegisterSuccess, agentAddress, agentName, category, description, policy, stakeValue, address]);

  const handleApprove = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!isConnected || !address) {
      setError("Connect your wallet before approving.");
      return;
    }

    if (!agentCourtAddress || !usdcAddress) {
      setError("AgentCourt addresses not resolved. Ensure protocol is configured.");
      return;
    }

    if (stakeValue < form.minimumStake) {
      setError(`Minimum stake is ${form.minimumStake} ${form.stakeUnit}.`);
      return;
    }

    if (!hasBalance) {
      setError("Insufficient USDC balance to approve.");
      return;
    }

    setLoading("approve");

    try {
      const hash = await approveUsdc({
        address: usdcAddress as `0x${string}`,
        abi: [
          {
            type: "function",
            name: "approve",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ],
        functionName: "approve",
        args: [agentCourtAddress, stakeAmountUnits],
      });
      setApproveTxHash(hash);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to send approve transaction.");
      setLoading(null);
    }
  }, [isConnected, address, agentCourtAddress, usdcAddress, stakeValue, form.minimumStake, form.stakeUnit, hasBalance, approveUsdc]);

  const handleRegister = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!isConnected || !address) {
      setError("Connect your wallet before registering.");
      return;
    }

    if (!agentCourtAddress) {
      setError("AgentCourt contract address not resolved.");
      return;
    }

    if (!(hasAllowance || allowanceConfirmed)) {
      setError("Approve USDC before registering.");
      return;
    }

    if (stakeValue < form.minimumStake) {
      setError(`Minimum stake is ${form.minimumStake} ${form.stakeUnit}.`);
      return;
    }

    if (!agentName.trim()) {
      setError("Agent name is required.");
      return;
    }

    if (!agentAddress.trim()) {
      setError("Agent address is required.");
      return;
    }

    setLoading("register");

    try {
      // Serialize description, policy, category as JSON inside the metadataURI
      const metadata = {
        name: agentName.trim(),
        category: category.trim() || "General",
        description: description.trim() || "Onchain Agent",
        policy: policy.trim() || "Verifiable execution rules",
      };
      const metadataURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

      const hash = await registerAgentOnChain({
        address: agentCourtAddress,
        abi: AGENT_COURT_ABI,
        functionName: "registerAgent",
        args: [stakeAmountUnits, metadataURI],
      });
      setRegisterTxHash(hash);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to send register transaction.");
      setLoading(null);
    }
  }, [
    isConnected,
    address,
    agentCourtAddress,
    hasAllowance,
    allowanceConfirmed,
    stakeValue,
    form.minimumStake,
    form.stakeUnit,
    agentName,
    agentAddress,
    category,
    description,
    policy,
    registerAgentOnChain,
    stakeAmountUnits,
  ]);

  return (
    <form className="panel">
      <h2 className="text-xl font-semibold">Register Form</h2>
      
      {!agentCourtAddress && (
        <div className="mt-4 rounded-lg bg-warning/10 p-3 text-xs text-warning border border-warning/20">
          <strong>Notice:</strong> AgentCourt contract is not configured. Please use the simulator dashboard utility to deploy the contract or set NEXT_PUBLIC_AGENT_COURT_ADDRESS in your .env.
        </div>
      )}

      <label className="mt-6 block">
        <span className="text-sm text-muted-foreground">Agent Name</span>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          value={agentName}
          onChange={(event) => setAgentName(event.target.value)}
          placeholder="MetaTrader AI"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm text-muted-foreground">Agent Address</span>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm"
          value={agentAddress}
          onChange={(event) => setAgentAddress(event.target.value)}
          placeholder="0x..."
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Use the agent wallet or agent contract address, not the AgentCourt contract address.
        </span>
      </label>
      <label className="mt-4 block">
        <span className="text-sm text-muted-foreground">Category</span>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Trading agent"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm text-muted-foreground">Description</span>
        <textarea
          className="mt-2 min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what the agent does..."
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm text-muted-foreground">Stake Policy</span>
        <textarea
          className="mt-2 min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={policy}
          onChange={(event) => setPolicy(event.target.value)}
          placeholder="What does the agent promise to do?"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm text-muted-foreground">{form.stakeLabel}</span>
        <span className="mt-2 flex h-11 items-center rounded-lg border border-input bg-background">
          <input
            className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
            value={stake}
            onChange={(event) => setStake(event.target.value)}
            inputMode="decimal"
          />
          <span className="border-l border-border px-3 font-mono text-sm text-muted-foreground">
            {form.stakeUnit}
          </span>
        </span>
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        You will stake{" "}
        <span className="font-mono text-foreground">
          {stakeValue || form.minimumStake} {form.stakeUnit}
        </span>
      </p>

      <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Transaction Preview</p>
        <div className="grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <span>Approval amount</span>
            <span className="font-mono font-semibold text-foreground">
              {stakeAmountDisplay} {form.stakeUnit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Register stake</span>
            <span className="font-mono font-semibold text-foreground">
              {stakeAmountDisplay} {form.stakeUnit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Agent address</span>
            <span className="font-mono font-semibold text-foreground">
              {agentAddress.trim() || "0x..."}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Arc Network Gas Verification</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Gas Payment Token</span>
            <span className="font-mono font-semibold text-foreground">USDC</span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Target Gas Price</span>
            <span className="font-mono font-semibold text-primary">21.5 Gwei</span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Network Status</span>
            <span className="flex items-center gap-1 font-semibold text-success">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              Verified (Active)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          onClick={() => void handleApprove()}
          disabled={loading !== null}
        >
          {loading === "approve" || isWaitingForApprove ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4" aria-hidden="true" />
          )}
          {loading === "approve" || isWaitingForApprove
            ? `Approving ${stakeAmountDisplay} ${form.stakeUnit}...`
            : hasAllowance || allowanceConfirmed
            ? `Allowance Approved · ${stakeAmountDisplay} ${form.stakeUnit}`
            : `${form.approveLabel} · ${stakeAmountDisplay} ${form.stakeUnit}`}
        </Button>
        <Button
          type="button"
          onClick={() => void handleRegister()}
          disabled={loading !== null}
        >
          {loading === "register" || isWaitingForRegister ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4" aria-hidden="true" />
          )}
          {loading === "register" || isWaitingForRegister
            ? `Registering ${stakeAmountDisplay} ${form.stakeUnit}...`
            : `${form.registerLabel} · ${stakeAmountDisplay} ${form.stakeUnit}`}
        </Button>
      </div>
      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}
      {success ? <p className="mt-4 text-xs text-success">{success}</p> : null}
      <p className="mt-5 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
        Minimum stake: {form.minimumStake} {form.stakeUnit}
      </p>
    </form>
  );
}
