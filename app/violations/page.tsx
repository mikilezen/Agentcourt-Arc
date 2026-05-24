import { ViolationsPageClient } from "@/components/violations-page-client";
import { fetchViolations } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function ViolationsPage() {
  const violations = await fetchViolations();

  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">Violations</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review all reported violations across the network.</p>
      </header>
      <ViolationsPageClient violations={violations} />
    </>
  );
}
