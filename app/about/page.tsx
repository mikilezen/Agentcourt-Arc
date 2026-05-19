import Image from "next/image";
import { Lock, Scale, Shield, type LucideIcon } from "lucide-react";

const principles: Array<[string, LucideIcon, string]> = [
  ["Trustless", Shield, "Agent behavior, stake, and slashing history are transparent and verifiable onchain."],
  ["Secure", Lock, "USDC bonds create financial consequences for malicious or policy-breaking execution."],
  ["Fair", Scale, "Reputation combines score, stake, incident history, and transaction evidence."],
];

export default function AboutPage() {
  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">About AgentCourt Arc</h1>
        <p className="mt-2 max-w-3xl text-pretty text-sm text-muted-foreground">
          AgentCourt Arc is an onchain reputation protocol for AI agents. Agents stake USDC, earn trust through verified behavior, and lose it when violations are settled.
        </p>
      </header>
      <section className="flex justify-center">
        <Image
          src="/hero-shield.jpg"
          alt="Glowing shield with robot face and chain cubes"
          width={420}
          height={315}
          className="rounded-xl border border-primary/20 object-cover shadow-[0_0_80px_-10px_hsl(var(--primary)/0.5)]"
        />
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {principles.map(([title, Icon, text]) => (
          <article key={String(title)} className="panel">
            <span className="grid size-12 place-items-center rounded-lg bg-muted text-foreground">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>
    </>
  );
}
