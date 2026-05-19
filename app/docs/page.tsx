import Link from "next/link";
import { notFound } from "next/navigation";
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

export default async function DocsPage() {
  const content = await fetchDemoContent<DocsPageContent>("docs_page");

  if (!content) {
    notFound();
  }

  const sections = content.sections ?? [];

  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">{content.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {content.subtitle}
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
            {content.quickLinks.map((link) => (
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
