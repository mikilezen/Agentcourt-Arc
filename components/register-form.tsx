"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  const [agentName, setAgentName] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [policy, setPolicy] = useState("");
  const [stake, setStake] = useState(String(form.defaultStake));
  const [loading, setLoading] = useState<"approve" | "register" | null>(null);
  const [approved, setApproved] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stakeValue = useMemo(() => {
    const parsed = Number(stake);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [stake]);

  const loadWallet = useCallback(async () => {
    try {
      const response = await fetch("/api/demo-flow", { cache: "no-store" });
      const data = (await response.json()) as DemoFlowResponse;

      if (!response.ok || !data.ok) {
        return;
      }

      const connected = Boolean(data.snapshot?.state?.wallet_connected);
      const wallet = data.snapshot?.state?.connected_wallet ?? null;

      setWalletConnected(connected);
      setConnectedWallet(wallet);
    } catch {
      // no-op for register form load
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const handleApprove = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!walletConnected) {
      setError("Connect your wallet before approving.");
      return;
    }

    if (stakeValue < form.minimumStake) {
      setError(`Minimum stake is ${form.minimumStake} ${form.stakeUnit}.`);
      return;
    }

    setLoading("approve");

    try {
      setApproved(true);
      setSuccess(`${form.stakeUnit} approved.`);
    } finally {
      setLoading(null);
    }
  }, [form.minimumStake, form.stakeUnit, stakeValue, walletConnected]);

  const handleRegister = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!walletConnected) {
      setError("Connect your wallet before registering.");
      return;
    }

    if (!approved) {
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
          walletAddress: connectedWallet,
        }),
      });

      const data = (await response.json()) as DemoFlowResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to register.");
      }

      setSuccess("Agent registered.");
      window.dispatchEvent(new CustomEvent("agentcourt:wallet-connected"));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to register.");
    } finally {
      setLoading(null);
    }
  }, [
    agentAddress,
    agentName,
    approved,
    category,
    connectedWallet,
    description,
    form.minimumStake,
    form.stakeUnit,
    policy,
    stakeValue,
    walletConnected,
  ]);

  return (
    <form className="panel">
      <h2 className="text-xl font-semibold">Register Form</h2>
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
      <div className="mt-6 flex flex-col gap-3">
        <Button type="button" onClick={() => void handleApprove()} disabled={loading !== null}>
          {loading === "approve" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4" aria-hidden="true" />
          )}
          {loading === "approve" ? "Approving..." : approved ? "Approved" : form.approveLabel}
        </Button>
        <Button
          type="button"
          onClick={() => void handleRegister()}
          disabled={loading !== null || !approved || !walletConnected}
        >
          {loading === "register" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4" aria-hidden="true" />
          )}
          {loading === "register" ? "Registering..." : form.registerLabel}
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
