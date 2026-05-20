import { cn } from "@/lib/utils";

export function AgentAvatar({ address, className }: { address: string; className?: string }) {
  const seed = Array.from(address).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hueA = seed % 360;
  const hueB = (seed * 7) % 360;
  const tail = address.slice(-4);

  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border border-border text-[12px] font-medium text-white",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hueA} 72% 40%), hsl(${hueB} 72% 32%))`,
      }}
      aria-hidden="true"
    >
      {tail}
    </span>
  );
}
