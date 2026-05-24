import { arcTestnet } from "@/lib/chain";

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end + 1) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatUSDC(value: number): string {
  return `${value.toLocaleString("en-US")} USDC`;
}

export function formatExplorerUrl(hash: string): string {
  return `${arcTestnet.blockExplorers.default.url}/tx/${hash}`;
}
