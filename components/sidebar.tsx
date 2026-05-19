"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDollarSign, Download, RotateCw, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { navItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background p-4">
      <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
        <span className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Shield className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-card-foreground">
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
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
          <p className="mt-3 font-mono text-2xl font-bold">120.50 USDC</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">~ $120.50</p>
          <Button variant="secondary" size="sm" className="mt-4 w-full">
            <Download className="size-4" aria-hidden="true" />
            Get Test USDC
          </Button>
        </div>

        <footer className="space-y-2 px-1 text-xs text-muted-foreground">
          <p>Built with love for the Agora</p>
          <p>Settled on Arc by (C) Circle</p>
          <p className="flex items-center gap-2 pt-1 font-semibold tracking-wide">
            <RotateCw className="size-4" aria-hidden="true" />
            ARC
          </p>
        </footer>
      </div>
    </aside>
  );
}
