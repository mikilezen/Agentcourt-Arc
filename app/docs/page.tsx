import Link from "next/link";
import { ArrowRight, ChevronRight, Code2, ExternalLink } from "lucide-react";

const sections = ["Introduction", "Smart Contract", "API Reference", "Events", "Frontend Guide", "FAQs"];

export default function DocsPage() {
  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">Documentation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Integration notes for protocol consumers, validators, and frontend builders.
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-xl border border-border bg-card p-3 lg:sticky lg:top-20">
          {sections.map((section, index) => (
            <a
              key={section}
              href={`#${section.toLowerCase().replaceAll(" ", "-")}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${index === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              {section}
              <ChevronRight className="size-4" aria-hidden="true" />
            </a>
          ))}
        </aside>
        <article className="panel prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground">
          <h2 id="introduction">Introduction</h2>
          <p>
            AgentCourt Arc records agent stake, reputation, violation reports, and slashing transactions against Arc Testnet. Identity is address-first and every important value should be displayable as a verifiable hash or transaction.
          </p>
          <h2 id="smart-contract">Smart Contract</h2>
          <p>
            Registration starts with <code className="rounded bg-muted px-1.5 py-0.5 font-mono">approve(usdc, amount)</code>, then calls <code className="rounded bg-muted px-1.5 py-0.5 font-mono">registerAgent(amount, metadata)</code>.
          </p>
          <h2 id="api-reference">API Reference</h2>
          <p>
            Read surfaces expose agents, violations, transactions, and aggregate protocol stats. Write surfaces map to wallet-confirmed contract calls.
          </p>
          <h2 id="events">Events</h2>
          <p>
            Listen for <code className="rounded bg-muted px-1.5 py-0.5 font-mono">AgentRegistered</code>, <code className="rounded bg-muted px-1.5 py-0.5 font-mono">ViolationReported</code>, and <code className="rounded bg-muted px-1.5 py-0.5 font-mono">StakeSlashed</code>.
          </p>
          <h2 id="frontend-guide">Frontend Guide</h2>
          <p>
            Replace <code className="rounded bg-muted px-1.5 py-0.5 font-mono">lib/mock-data.ts</code> with contract-backed hooks while keeping the table and badge components unchanged.
          </p>
          <h2 id="faqs">FAQs</h2>
          <p>
            Scores are visible, stake is denominated in USDC, and slashing evidence should link to an Arc explorer transaction.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <QuickLink icon={ExternalLink} title="Smart Contract" label="View contract on Explorer" href="https://explorer-testnet.arc.network" />
            <QuickLink icon={Code2} title="GitHub Repo" label="View source code" href="/" />
          </div>
        </article>
      </section>
    </>
  );
}

function QuickLink({ icon: Icon, title, label, href }: { icon: typeof ExternalLink; title: string; label: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 no-underline hover:bg-muted/40">
      <span className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-semibold text-foreground">{title}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}
