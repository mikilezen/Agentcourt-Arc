import { useCallback, useEffect, useMemo, useState } from "react";
import { arcTestnet } from "@/lib/chain";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDollarSign, Download, Loader2 } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";

import { Button } from "@/components/ui/button";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { AGENT_COURT_ABI } from "@/lib/agent-court";

const addThousandsSeparators = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const splitNumericString = (value: string) => {
  const negative = value.startsWith("-");
  const clean = negative ? value.slice(1) : value;
  const [intPart = "0", fracPart = ""] = clean.split(".");
  return { negative, intPart, fracPart };
};

const formatNumericString = (value: string, fractionDigits: number) => {
  const { negative, intPart, fracPart } = splitNumericString(value);
  const groupedInt = addThousandsSeparators(intPart || "0");
  if (fractionDigits === 0) {
    return `${negative ? "-" : ""}${groupedInt}`;
  }
  const fraction = fracPart.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  return `${negative ? "-" : ""}${groupedInt}.${fraction}`;
};

const formatNumericFull = (value: string) => {
  const { negative, intPart, fracPart } = splitNumericString(value);
  const groupedInt = addThousandsSeparators(intPart || "0");
  const full = fracPart ? `${groupedInt}.${fracPart}` : groupedInt;
  return `${negative ? "-" : ""}${full}`;
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { address } = useAccount();

  const [agentCourtAddress, setAgentCourtAddress] = useState<`0x${string}` | undefined>(undefined);
  const [mintTxHash, setMintTxHash] = useState<`0x${string}` | undefined>(undefined);

  // Resolve contract address on mount & localStorage changes
  useEffect(() => {
    const resolve = () => {
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
    };

    resolve();

    window.addEventListener("agentcourt:contracts-deployed", resolve);
    return () => {
      window.removeEventListener("agentcourt:contracts-deployed", resolve);
    };
  }, []);

  // Read USDC address from AgentCourt
  const { data: usdcAddress } = useReadContract({
    address: agentCourtAddress,
    abi: AGENT_COURT_ABI,
    functionName: "usdc",
    query: {
      enabled: Boolean(agentCourtAddress),
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
    if (rawUsdcDecimals === undefined) return arcTestnet.nativeCurrency.decimals;
    const parsed = typeof rawUsdcDecimals === "number" ? rawUsdcDecimals : Number(rawUsdcDecimals);
    return Number.isFinite(parsed) ? parsed : arcTestnet.nativeCurrency.decimals;
  }, [rawUsdcDecimals]);

  const usdcBalance = useMemo(() => {
    const raw = formatUnits(rawBalance ?? BigInt(0), usdcDecimals);
    return {
      display: formatNumericString(raw, 2),
      approx: formatNumericString(raw, 1),
      full: formatNumericFull(raw),
    };
  }, [rawBalance, usdcDecimals]);

  const [totalStaked, setTotalStaked] = useState<number>(0);

  // Fetch total staked from demo-flow API
  const fetchTotalStaked = useCallback(async () => {
    try {
      const response = await fetch("/api/demo-flow", { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Invalid response");
      }
      const data = await response.json();
      if (data?.ok && data?.snapshot?.agents) {
        const sum = data.snapshot.agents.reduce(
          (acc: number, agent: any) => acc + (Number(agent.staked_usdc) || 0),
          0
        );
        setTotalStaked(sum);
      }
    } catch (err) {
      console.error("Failed to fetch total staked for sidebar:", err);
    }
  }, []);

  // Fetch on mount, event triggers, and periodically
  useEffect(() => {
    void fetchTotalStaked();

    window.addEventListener("agentcourt:wallet-connected", fetchTotalStaked);
    window.addEventListener("agentcourt:contracts-deployed", fetchTotalStaked);

    return () => {
      window.removeEventListener("agentcourt:wallet-connected", fetchTotalStaked);
      window.removeEventListener("agentcourt:contracts-deployed", fetchTotalStaked);
    };
  }, [fetchTotalStaked]);

  // Mint USDC action
  const { writeContractAsync: mintUsdc, isPending: isRequestingMint } = useWriteContract();
  const { isLoading: isWaitingForMint } = useWaitForTransactionReceipt({ hash: mintTxHash });

  const mintAmount = useMemo(() => BigInt(1000) * BigInt(10) ** BigInt(usdcDecimals), [usdcDecimals]);

  const handleGetUsdc = useCallback(async () => {
    if (!address || !usdcAddress) {
      return;
    }

    try {
      const hash = await mintUsdc({
        address: usdcAddress as `0x${string}`,
        abi: [
          {
            type: "function",
            name: "mint",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [],
          },
        ],
        functionName: "mint",
        args: [address, mintAmount],
      });
      setMintTxHash(hash);
    } catch (error) {
      console.error("Minting USDC failed:", error);
    }
  }, [address, usdcAddress, mintAmount, mintUsdc]);

  // Refetch balance when transaction completes
  useEffect(() => {
    if (mintTxHash && !isWaitingForMint) {
      void refetchBalance();
      void fetchTotalStaked();
      setMintTxHash(undefined);
    }
  }, [mintTxHash, isWaitingForMint, refetchBalance, fetchTotalStaked]);

  return (
    <aside className="overflow-y-auto scrollbar-thumb-black scrollbar-thin flex h-full w-64 flex-col border-r border-border bg-background p-4">
      <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
        <span className="grid place-items-center">
          <img src="/agentcourt.svg" alt="" className="h-9 w-9" />
        </span>
        <span>
          <span className="block text-md font-semibold text-card-foreground">
            AgentCourt <span className="text-primary">Arc</span>
          </span>
          <span className="block text-xs text-muted-foreground">On-chain reputation for AI agents</span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "border border-primary/20 bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent/15 hover:text-foreground"
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <br />

      <div className="mt-auto flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <p className="text-xs text-muted-foreground">Arc Testnet (Altar)</p>
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">Chain ID: {arcTestnet.id}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CircleDollarSign className="size-5" aria-hidden="true" />
            <p className="text-xs">USDC Balance</p>
          </div>
          <p className="mt-3 truncate font-mono text-2xl font-bold" title={`${usdcBalance.full} USDC`}>
            {usdcBalance.display} USDC
          </p>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={`$${usdcBalance.full}`}>
            ~ ${usdcBalance.approx}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Protocol Total: {totalStaked.toFixed(2)} USDC
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            disabled={!address || !usdcAddress || isRequestingMint || isWaitingForMint}
            onClick={() => void handleGetUsdc()}
          >
            {isRequestingMint || isWaitingForMint ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            {isRequestingMint || isWaitingForMint ? "Minting..." : "Get Test USDC"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
