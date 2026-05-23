import Link from "next/link";
import { ArrowRight, ChevronRight, Code2, ExternalLink } from "lucide-react";

import { fetchDemoContent } from "@/lib/demo-content";

type DocPart = {
  type: "text" | "code";
  value: string;
};

type DocSection = {
  id: string;
  title: string;
  body?: string;
  parts?: DocPart[];
  bullets?: string[];
};

type DocQuickLink = {
  title: string;
  label: string;
  href: string;
  icon: "ExternalLink" | "Code2";
};

type DocsPageContent = {
  title: string;
  subtitle: string;
  sections: DocSection[];
  quickLinks: DocQuickLink[];
};

export const dynamic = "force-dynamic";

const iconMap: Record<DocQuickLink["icon"], typeof ExternalLink> = {
  ExternalLink,
  Code2,
};

const LOCAL_FALLBACK_CONTENT: DocsPageContent = {
  title: "AgentCourt Builder Documentation",
  subtitle: "Set up AgentCourt, connect your agent through the SDK, persist runtime state in Supabase, and deploy Web3 mode on Arc.",
  sections: [
    {
      id: "introduction",
      title: "What AgentCourt Does",
      body: "AgentCourt is the trust and enforcement layer for autonomous agents. Your agent calls the SDK before risky actions, AgentCourt evaluates policy, and the dashboard records allowed actions, approvals, blocked calls, evidence hashes, reputation, stake, and violations.",
    },
    {
      id: "setup",
      title: "Local Setup",
      parts: [
        { type: "code", value: "cd AgentCourt-Arc && npm install && npm run dev" },
        { type: "text", value: " starts the dashboard at http://localhost:3000. On Windows PowerShell, use " },
        { type: "code", value: "npm run dev" },
        { type: "text", value: " if script execution policy blocks npm." },
      ],
    },
    {
      id: "environment",
      title: "Environment",
      body: "Set Supabase, Arc RPC, explorer, and deployed contract values in .env. Keep SUPABASE_SERVICE_ROLE_KEY server-only.",
      bullets: [
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY power the client.",
        "SUPABASE_SERVICE_ROLE_KEY is used only by server routes.",
        "NEXT_PUBLIC_AGENT_COURT_ADDRESS enables real Web3 mode.",
        "NEXT_PUBLIC_ARC_TESTNET_RPC_URL controls Arc RPC connectivity.",
      ],
    },
    {
      id: "sdk",
      title: "Connect An Agent",
      parts: [
        { type: "text", value: "Import " },
        { type: "code", value: "AgentCourtOrchestrator" },
        { type: "text", value: " and wrap every risky tool call with " },
        { type: "code", value: "court.callTool(agent, tool, args, execute)" },
        { type: "text", value: ". The SDK returns ALLOW, STOP_TOOL, or HUMAN_IN_THE_LOOP plus an evidence hash." },
      ],
    },
    {
      id: "supabase",
      title: "Supabase Runtime",
      body: "The dashboard reads and writes through /api/demo-flow. Create agentcourt_demo_state, agentcourt_demo_agents, and agentcourt_demo_violations before running the full demo.",
      bullets: [
        "GET /api/demo-flow returns state, agents, and violations.",
        "POST /api/demo-flow accepts connect_wallet, register_metatrader, run_market_agent, run_safe_action, and simulate_dangerous_action.",
        "Blocked SDK decisions are stored as violations with evidence hashes.",
      ],
    },
    {
      id: "metamask",
      title: "MetaMask Troubleshooting",
      body: "If MetaMask throws Failed to connect to MetaMask, unlock the extension, refresh the page, disconnect the site in MetaMask settings, and connect again. Also check that only one wallet extension is injecting a provider and that your Arc RPC URL is reachable.",
    },
    {
      id: "deploy",
      title: "Deploy",
      body: "Deploy AgentCourt-Arc to Vercel, add the environment variables, run the Supabase SQL from docs/agent-builder-guide.md, deploy the AgentCourt contract on Arc Testnet, and set NEXT_PUBLIC_AGENT_COURT_ADDRESS.",
    },
  ],
  quickLinks: [
    {
      title: "Smart Contract",
      label: "View contract on Explorer",
      href: "http://testnet.arcscan.app/",
      icon: "ExternalLink",
    },
    {
      title: "Builder Guide",
      label: "Read the full local guide",
      href: "/github.com/mikilezen/agentcourt-arc",
      icon: "Code2",
    },
  ],
};

export default async function DocsPage() {
  let content: DocsPageContent | null = null;
  try {
    content = await fetchDemoContent<DocsPageContent>("docs_page");
  } catch (err) {
    console.warn("Failed to fetch docs_page content from database, using high-quality local fallback:", err);
  }

  const finalContent = content || LOCAL_FALLBACK_CONTENT;
  const sections = finalContent.sections ?? [];

  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">{finalContent.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {finalContent.subtitle}
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-xl border border-border bg-card p-3 lg:sticky lg:top-20">
          {sections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${index === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              {section.title}
              <ChevronRight className="size-4" aria-hidden="true" />
            </a>
          ))}
        </aside>
        <article className="panel prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground">
          {sections.map((section) => (
            <div key={section.id}>
              <h2 id={section.id}>{section.title}</h2>
              {section.parts && section.parts.length ? (
                <p>
                  {section.parts.map((part, index) =>
                    part.type === "code" ? (
                      <code key={`${section.id}-code-${index}`} className="rounded bg-muted px-1.5 py-0.5 font-mono">
                        {part.value}
                      </code>
                    ) : (
                      <span key={`${section.id}-text-${index}`}>{part.value}</span>
                    )
                  )}
                </p>
              ) : section.body ? (
                <p>{section.body}</p>
              ) : null}
              {section.bullets && section.bullets.length ? (
                <ul>
                  {section.bullets.map((bullet, index) => (
                    <li key={`${section.id}-bullet-${index}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {finalContent.quickLinks.map((link) => (
              <QuickLink
                key={link.title}
                icon={iconMap[link.icon] ?? ExternalLink}
                title={link.title}
                label={link.label}
                href={link.href}
              />
            ))}
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
