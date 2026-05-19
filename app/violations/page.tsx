import { ChevronDown, Search } from "lucide-react";

import { ViolationsTable } from "@/components/violations-table";
import { violations } from "@/lib/mock-data";

export default function ViolationsPage() {
  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">Violations</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review all reported violations across the network.</p>
      </header>
      <section className="panel flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm" placeholder="Search by agent or reason..." />
        </label>
        {["All Severity", "All Time"].map((label) => (
          <button key={label} className="flex h-10 items-center justify-between gap-4 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground md:w-44">
            {label}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        ))}
      </section>
      <ViolationsTable violations={violations} />
    </>
  );
}
