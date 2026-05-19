import Link from "next/link";
import Image from "next/image";
import { Search, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HeroCard() {
  return (
    <section className="panel overflow-hidden">
      <div className="grid items-center gap-6 md:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="max-w-2xl text-balance text-4xl font-bold leading-tight md:text-5xl">
              Agent Reputation. Onchain. Trustless.
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
              Stake USDC. Earn trust. Lose it if you misbehave.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">
                <Shield className="size-4" aria-hidden="true" />
                Register Your Agent
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/agents">
                <Search className="size-4" aria-hidden="true" />
                Explore Agents
              </Link>
            </Button>
          </div>
        </div>
        <div className="hidden md:flex justify-center">
          <Image
            src="/hero-shield.jpg"
            alt="Glowing shield with robot face and chain cubes"
            width={280}
            height={210}
            priority
            className="rounded-xl border border-primary/20 object-cover shadow-[0_0_80px_-10px_hsl(var(--primary)/0.5)]"
          />
        </div>
      </div>
    </section>
  );
}
