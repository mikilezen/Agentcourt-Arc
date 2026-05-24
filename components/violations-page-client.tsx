"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { ViolationsTable } from "@/components/violations-table";
import { Violation } from "@/lib/types";

const SEVERITY_OPTIONS = ["All Severity", "High", "Medium", "Low"] as const;
const TIME_OPTIONS = ["All Time", "Last 24h", "Last 7d", "Last 30d"] as const;

export function ViolationsPageClient({ violations }: { violations: Violation[] }) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string>("All Severity");
  const [timeRange, setTimeRange] = useState<string>("All Time");
  const [severityOpen, setSeverityOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = violations;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.agentAddress.toLowerCase().includes(q) ||
          v.reason.toLowerCase().includes(q)
      );
    }

    // Severity filter
    if (severity !== "All Severity") {
      result = result.filter((v) => v.severity.toLowerCase() === severity.toLowerCase());
    }

    // Time filter
    if (timeRange !== "All Time") {
      const now = Date.now();
      const cutoffs: Record<string, number> = {
        "Last 24h": 24 * 60 * 60 * 1000,
        "Last 7d": 7 * 24 * 60 * 60 * 1000,
        "Last 30d": 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = cutoffs[timeRange];
      if (cutoff) {
        result = result.filter((v) => {
          // reportedAt is relative (e.g., "2m ago"), so we approximate
          const match = v.reportedAt.match(/(\d+)(s|m|h|d)/);
          if (!match) return true;
          const value = parseInt(match[1]);
          const unit = match[2];
          const ms = unit === "s" ? value * 1000 : unit === "m" ? value * 60000 : unit === "h" ? value * 3600000 : value * 86400000;
          return ms <= cutoff;
        });
      }
    }

    return result;
  }, [violations, search, severity, timeRange]);

  return (
    <>
      <section className="panel flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm"
            placeholder="Search by agent or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {/* Severity dropdown */}
        <div className="relative">
          <button
            className="flex h-10 items-center justify-between gap-4 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground md:w-44"
            onClick={() => { setSeverityOpen(!severityOpen); setTimeOpen(false); }}
          >
            {severity}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
          {severityOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${opt === severity ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => { setSeverity(opt); setSeverityOpen(false); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Time dropdown */}
        <div className="relative">
          <button
            className="flex h-10 items-center justify-between gap-4 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground md:w-44"
            onClick={() => { setTimeOpen(!timeOpen); setSeverityOpen(false); }}
          >
            {timeRange}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
          {timeOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${opt === timeRange ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => { setTimeRange(opt); setTimeOpen(false); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <ViolationsTable violations={filtered} />
      {filtered.length === 0 && violations.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No violations match your filters.</p>
      )}
    </>
  );
}
