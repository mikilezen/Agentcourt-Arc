"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, Shield } from "lucide-react";

import { AgentsTable } from "@/components/agents-table";
import { Button } from "@/components/ui/button";
import { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";

type ReputationFilter = "all" | "80+" | "60-79" | "0-59";

type StatusFilter = "all" | "active" | "at-risk" | "slashed";

const reputationOptions: Array<{ value: ReputationFilter; label: string }> = [
  { value: "all", label: "All Reputation" },
  { value: "80+", label: "80+" },
  { value: "60-79", label: "60-79" },
  { value: "0-59", label: "Below 60" },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "at-risk", label: "At Risk" },
  { value: "slashed", label: "Slashed" },
];

export function AgentsPageClient({ initialAgents }: { initialAgents: Agent[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [reputationFilter, setReputationFilter] = useState<ReputationFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredAgents = useMemo(() => {
    let results = [...initialAgents];
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      results = results.filter((agent) => {
        return [agent.name, agent.address, agent.owner]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      });
    }

    if (statusFilter !== "all") {
      results = results.filter((agent) => agent.status === statusFilter);
    }

    if (reputationFilter !== "all") {
      results = results.filter((agent) => {
        if (reputationFilter === "80+") return agent.reputation >= 80;
        if (reputationFilter === "60-79") return agent.reputation >= 60 && agent.reputation < 80;
        return agent.reputation < 60;
      });
    }

    return results;
  }, [initialAgents, reputationFilter, searchTerm, statusFilter]);

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

      <section className="panel flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm"
            placeholder="Search by address, name, or owner..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <FilterSelect
            value={reputationFilter}
            onChange={(value) => setReputationFilter(value as ReputationFilter)}
            options={reputationOptions}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={statusOptions}
          />
        </div>
      </section>

      <AgentsTable agents={filteredAgents} />
    </>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative md:w-44">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm",
          value === "all" ? "text-muted-foreground" : "text-foreground"
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}
