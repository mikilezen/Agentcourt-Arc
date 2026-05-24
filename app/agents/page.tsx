import { AgentsPageClient } from "@/components/agents-page-client";
import { fetchAgents } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await fetchAgents();

  return <AgentsPageClient initialAgents={agents} />;
}
