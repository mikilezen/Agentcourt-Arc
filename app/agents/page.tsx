import Link from "next/link";
import { ChevronDown, Search, Shield } from "lucide-react";

import { AgentsTable } from "@/components/agents-table";
import { Button } from "@/components/ui/button";
import { agents } from "@/lib/mock-data";

export default function AgentsPage() {
  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-balance text-3xl font-semibold leading-tight">All Agents</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track active agents, stake commitments, and reputation scores.
          </p>
        </div>
        <Button asChild>
          <Link href="/register">
            <Shield className="size-4" aria-hidden="true" />
            Register Agent
          </Link>
        </Button>
      </header>

      <section className="panel flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm"
            placeholder="Search by address or name..."
          />
        </label>
        {["All Reputation", "All Status"].map((label) => (
          <button key={label} className="flex h-10 items-center justify-between gap-4 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground md:w-44">
            {label}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        ))}
      </section>

      <AgentsTable agents={agents} />
      <Pagination />
    </>
  );
}

function Pagination() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((page) => (
        <button
          key={page}
          className={`grid size-9 place-items-center rounded-lg text-sm ${page === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
        >
          {page}
        </button>
      ))}
    </div>
  );
}
