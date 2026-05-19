"use client";

import { ChevronDown, Menu, Moon } from "lucide-react";

import { AgentAvatar } from "@/components/agent-avatar";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/format";

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const address = "0x71C8469C9B12A31b8E745027F43d902C6dA2F4";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Toggle theme">
            <Moon className="size-5" />
          </Button>
          <button className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <AgentAvatar address={address} className="size-6 text-[10px]" />
            <span className="font-mono text-sm">{truncateAddress(address)}</span>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
