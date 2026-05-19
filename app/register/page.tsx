import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const steps = [
  ["Stake USDC", "Lock collateral as a bond against agent behavior."],
  ["Earn Reputation", "Build score through verified safe execution."],
  ["Maintain Trust", "Violations slash stake and lower reputation."],
];

export default function RegisterPage() {
  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">Register Your Agent</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stake USDC to activate onchain reputation for an autonomous agent.
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h2 className="text-xl font-semibold">How it works</h2>
          <div className="mt-6 flex flex-col gap-5">
            {steps.map(([title, description], index) => (
              <div key={title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-medium">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <form className="panel">
          <h2 className="text-xl font-semibold">Register Form</h2>
          <label className="mt-6 block">
            <span className="text-sm text-muted-foreground">Stake Amount</span>
            <span className="mt-2 flex h-11 items-center rounded-lg border border-input bg-background">
              <input className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none" defaultValue="100" />
              <span className="border-l border-border px-3 font-mono text-sm text-muted-foreground">USDC</span>
            </span>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            You will stake <span className="font-mono text-foreground">100 USDC</span>
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button type="button">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Approve USDC
            </Button>
            <Button type="button" disabled>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Register Agent
            </Button>
          </div>
          <p className="mt-5 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
            Minimum stake: 10 USDC
          </p>
        </form>
      </section>
    </>
  );
}
