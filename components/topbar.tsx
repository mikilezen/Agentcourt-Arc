"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, MonitorPlay, PlugZap, Wallet } from "lucide-react";

import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";

import { AgentAvatar } from "@/components/agent-avatar";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/format";

function walletErrorMessage(caughtError: unknown) {
  const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
  const cause =
    caughtError instanceof Error && caughtError.cause instanceof Error
      ? caughtError.cause.message
      : "";
  const combined = `${message} ${cause}`;

  if (
    combined.includes("MetaMask extension not found") ||
    combined.includes("Failed to connect to MetaMask") ||
    combined.includes("Connector not found") ||
    combined.includes("Provider not found")
  ) {
    return "The browser wallet is not available to this page. Unlock your wallet, refresh, or use simulator mode.";
  }

  if (combined.includes("User rejected") || combined.includes("rejected")) {
    return "Connection request was rejected in MetaMask.";
  }

  return "Connection failed. Open the wallet toolbox below and try the reset steps.";
}

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const connectRef = useRef<HTMLDivElement | null>(null);

  // Sync wallet connection status with database state
  useEffect(() => {
    if (isConnected && address) {
      void fetch("/api/demo-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect_wallet",
          walletAddress: address,
        }),
      }).then(() => {
        window.dispatchEvent(new CustomEvent("agentcourt:wallet-connected"));
      });
    } else if (!isConnected) {
      void fetch("/api/demo-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect_wallet" }),
      }).then(() => {
        window.dispatchEvent(new CustomEvent("agentcourt:wallet-connected"));
      });
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (!menuOpen && !connectOpen && !toolboxOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (connectRef.current && !connectRef.current.contains(event.target)) {
        setConnectOpen(false);
        setToolboxOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [connectOpen, menuOpen, toolboxOpen]);

  // Deduplicate and filter out generic injected connector if specific wallets exist (via EIP-6963)
  const displayedConnectors = useMemo(() => {
    if (connectors.length <= 1) {
      return connectors;
    }
    const hasSpecific = connectors.some((c) => c.id !== "injected");
    if (hasSpecific) {
      return connectors.filter((c) => c.id !== "injected");
    }
    return connectors;
  }, [connectors]);

  const connectWalletByConnector = useCallback(
    async (connector: Connector) => {
      setError(null);
      connect(
        { connector },
        {
          onSuccess: () => {
            setMenuOpen(false);
            setToolboxOpen(false);
            setConnectOpen(false);
          },
          onError: (caughtError) => {
            setError(walletErrorMessage(caughtError));
            setToolboxOpen(true);
          },
        }
      );
    },
    [connect]
  );

  const useSimulatorWallet = useCallback(async () => {
    const demoAddress = "0x000000000000000000000000000000000000A7C1";
    setError(null);

    await fetch("/api/demo-flow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "connect_wallet",
        walletAddress: demoAddress,
      }),
    });

    window.dispatchEvent(new CustomEvent("agentcourt:wallet-connected"));
    setToolboxOpen(false);
    setConnectOpen(false);
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (!address) {
      return;
    }

    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(address);
    }

    setMenuOpen(false);
  }, [address]);

  const handleLogout = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    } finally {
      setMenuOpen(false);
    }
  }, [disconnectAsync]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
        <div className="ml-auto flex items-center gap-3">
          {address ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 hover:border-muted-foreground/50 transition-colors"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <AgentAvatar address={address} className="size-6 text-[10px]" />
                <span className="font-mono text-sm">{truncateAddress(address)}</span>
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card p-2 shadow-lg"
                  role="menu"
                >
                  <p className="px-2 py-1 text-xs text-muted-foreground">Wallet</p>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={handleCopyAddress}
                    role="menuitem"
                  >
                    Copy address
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-2 text-left text-sm text-destructive hover:bg-muted"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative flex flex-col items-end gap-1" ref={connectRef}>
              <Button onClick={() => setConnectOpen((open) => !open)} disabled={isConnecting}>
                <Wallet className="size-4 mr-2" />
                {isConnecting ? "Connecting..." : "Connect with"}
                <ChevronDown className="size-4 ml-1" />
              </Button>
              {connectOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-card p-2 text-left text-sm shadow-lg animate-in fade-in slide-in-from-top-1 duration-250">
                  <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Choose connection</p>
                  {/* <button
                    type="button"
                    className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                    onClick={() => void useSimulatorWallet()}
                  >
                    <MonitorPlay className="mt-0.5 size-4 text-success" />
                    <span>
                      <span className="block font-medium">Simulator</span>
                      <span className="block text-xs text-muted-foreground">Run AgentCourt without any wallet extension.</span>
                    </span>
                  </button> */}

                  {displayedConnectors.map((connector) => (
                    <button
                      key={connector.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                      onClick={() => void connectWalletByConnector(connector)}
                    >
                      <PlugZap className="mt-0.5 size-4 text-primary" />
                      <span>
                        <span className="block font-medium">{connector.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          Connect using {connector.name} extension.
                        </span>
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                    onClick={() => setToolboxOpen((open) => !open)}
                  >
                    <Wallet className="mt-0.5 size-4 text-warning" />
                    <span>
                      <span className="block font-medium">Wallet toolbox</span>
                      <span className="block text-xs text-muted-foreground">Fix extension conflicts and refresh the page.</span>
                    </span>
                  </button>
                </div>
              ) : null}
              {error ? (
                <button
                  type="button"
                  className="max-w-[260px] text-right text-[10px] font-semibold text-destructive underline-offset-4 hover:underline"
                  onClick={() => setToolboxOpen((open) => !open)}
                >
                  {error}
                </button>
              ) : null}
              {toolboxOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card p-3 text-left text-xs shadow-lg animate-in fade-in slide-in-from-top-1 duration-250">
                  <p className="font-semibold text-foreground">Wallet toolbox</p>
                  
                  <div className="my-2 rounded border border-border bg-muted/40 p-2 font-mono text-[10px] text-muted-foreground space-y-1">
                    <p className="text-foreground font-semibold">Arc Testnet Settings:</p>
                    <p>• RPC: https://rpc.testnet.arc.network</p>
                    <p>• Chain ID: 5042002</p>
                    <p>• Currency: USDC (18 Decimals)</p>
                    <p>• Current Gas Price: ~21.5 Gwei</p>
                  </div>

                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
                    <li>Use MetaMask, Rabby, Coinbase Wallet, or Brave.</li>
                    <li>Unlock your wallet and select Arc Testnet.</li>
                    <li>Ensure you have USDC for gas (21.5 Gwei).</li>
                    <li>If one wallet is broken, disable it for this tab and refresh.</li>
                  </ol>
                  
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {/* <Button type="button" size="sm" variant="outline" onClick={() => void useSimulatorWallet()}>
                      Simulator
                    </Button> */}
                    <Button type="button" size="sm" variant="ghost" onClick={() => setToolboxOpen(false)}>
                      Close
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => window.location.reload()}>
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
