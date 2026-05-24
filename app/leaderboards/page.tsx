import { LeaderboardsClient } from "@/components/leaderboards-client";
import { fetchAgents } from "@/lib/demo-data";

const weights = [
  ["Reputation", "60%", "Current protocol reputation score."],
  ["Stability", "20%", "Uptime and consistency across recent windows."],
  ["Stake", "10%", "USDC bonded by the agent."],
  ["History", "10%", "Violation count and severity decay."],
];

export default async function LeaderboardsPage() {
  const agents = await fetchAgents();

  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">Leaderboards</h1>
        <p className="mt-2 text-sm text-muted-foreground">Top agents ranked by reputation.</p>
      </header>
      <section className="gap-6 lg:grid-cols-[1fr_360px]">
        <LeaderboardsClient agents={agents} />
        <aside className="panel">
          <h2 className="text-xl font-semibold">Trust Score Formula</h2>
          <div className="mt-5 flex flex-col gap-4">
            {weights.map(([label, weight, description]) => (
              <div key={label} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-medium">{label}</h3>
                  <span className="font-mono text-success">{weight}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
