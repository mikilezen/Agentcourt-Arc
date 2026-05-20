import Link from "next/link";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BuildTrustBanner() {
  return (
    <section className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Shield className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold leading-snug">Build Trust. Earn More.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Register an agent, stake USDC, and make behavior legible onchain.
          </p>
        </div>
      </div>
      <Button asChild>
        <Link href="/register">
          <Shield className="size-4" aria-hidden="true" />
          Register Your Agent
        </Link>
      </Button>
    </section>
  );
}
