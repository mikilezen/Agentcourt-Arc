import Link from "next/link";

import { AgentsTable } from "@/components/agents-table";
import { BuildTrustBanner } from "@/components/build-trust-banner";
import { HeroCard } from "@/components/hero-card";
import { RecentViolations } from "@/components/recent-violations";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { agents, dashboardStats, violations } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <>
      <HeroCard />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-0">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-semibold leading-snug">Top Agents</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/agents">View All Agents</Link>
            </Button>
          </div>
          <div className="px-6 pb-6">
            <AgentsTable agents={agents} limit={5} />
          </div>
        </div>
        <RecentViolations violations={violations} />
      </section>

      <BuildTrustBanner />
    </>
  );
}
