"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Moon } from "lucide-react";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

import { AgentAvatar } from "@/components/agent-avatar";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/format";

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { address, isConnected } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    if (!menuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current || !(event.target instanceof Node)) {
        return;
      }

      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [menuOpen]);

  const connectWallet = useCallback(async () => {
    setError(null);
    try {
      await connectAsync({ connector: injected() });
      setMenuOpen(false);
    } catch (caughtError) {
      console.error("Failed to connect wallet:", caughtError);
      const errMsg = caughtError instanceof Error ? caughtError.message : String(caughtError);
      if (
        errMsg.includes("Connector not found") ||
        errMsg.includes("Provider not found") ||
        caughtError?.constructor?.name === "ProviderNotFoundError" ||
        caughtError?.constructor?.name === "ConnectorNotFoundError"
      ) {
        setError("Web3 wallet not found. Please install MetaMask or another extension.");
      } else {
        setError("Connection failed. Please try again.");
      }
    }
  }, [connectAsync]);

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
          {/* <Button variant="ghost" size="icon-sm" aria-label="Toggle theme">
            <Moon className="size-5" />
          </Button> */}
          {address ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
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
            <div className="flex flex-col items-end gap-1">
              <Button onClick={() => void connectWallet()} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
              {error ? (
                <span className="text-[10px] font-semibold text-destructive max-w-[200px] text-right">
                  {error}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
