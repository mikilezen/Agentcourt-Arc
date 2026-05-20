import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDollarSign, Download, Loader2 } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

import { Button } from "@/components/ui/button";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { AGENT_COURT_ABI } from "@/lib/agent-court";

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

  const usdcBalance = rawBalance ? Number(rawBalance) / 1e6 : 0;

  // Mint USDC action
  const { writeContractAsync: mintUsdc, isPending: isRequestingMint } = useWriteContract();
  const { isLoading: isWaitingForMint } = useWaitForTransactionReceipt({ hash: mintTxHash });

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
        args: [address, BigInt(1000 * 1e6)],
      });
      setMintTxHash(hash);
    } catch (error) {
      console.error("Minting USDC failed:", error);
    }
  }, [address, usdcAddress, mintUsdc]);

  // Refetch balance when transaction completes
  useEffect(() => {
    if (mintTxHash && !isWaitingForMint) {
      void refetchBalance();
      setMintTxHash(undefined);
    }
  }, [mintTxHash, isWaitingForMint, refetchBalance]);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background p-4">
      <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
        <span className="grid place-items-center">
          <img src="/logo.jpg" alt="" className="h-9 w-9" />
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

      <div className="mt-auto flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <p className="text-xs text-muted-foreground">Arc Testnet (Altar)</p>
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">Chain ID: 11155422</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CircleDollarSign className="size-5" aria-hidden="true" />
            <p className="text-xs">USDC Balance</p>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold">
            {address ? `${usdcBalance.toFixed(2)} USDC` : "— USDC"}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {address ? `~ $${usdcBalance.toFixed(2)}` : "~ $0.00"}
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
