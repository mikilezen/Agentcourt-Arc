"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Moon } from "lucide-react";

import { AgentAvatar } from "@/components/agent-avatar";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/format";

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const defaultAddress = "0x0c9A8B125aB722A518C6d6f94714a52C8886b26A";
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      const response = await fetch("/api/demo-flow", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        return;
      }

      const connectedWallet = (data.snapshot?.state?.connected_wallet as string | null | undefined) ?? null;
      setAddress(connectedWallet);
    } catch {
      // no-op for topbar wallet preview
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWallet();
  }, [loadWallet]);

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
    setLoading(true);

    try {
      const response = await fetch("/api/demo-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect_wallet",
          walletAddress: defaultAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to connect wallet.");
      }

      const connectedWallet = (data.snapshot?.state?.connected_wallet as string | null | undefined) ?? defaultAddress;
      setAddress(connectedWallet);
      setMenuOpen(false);
      window.dispatchEvent(new CustomEvent("agentcourt:wallet-connected"));
    } catch {
      // no-op for topbar button
    } finally {
      setLoading(false);
    }
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
      const response = await fetch("/api/demo-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect_wallet" }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to disconnect wallet.");
      }

      setAddress(null);
      window.dispatchEvent(new CustomEvent("agentcourt:wallet-connected"));
    } catch {
      // no-op for topbar menu action
    } finally {
      setMenuOpen(false);
    }
  }, []);

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
            <Button onClick={() => void connectWallet()} disabled={loading}>
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
