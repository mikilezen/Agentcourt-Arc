import { createPublicClient, defineChain, http } from "viem";

const rpcUrl = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? "https://rpc.alta.testnet.arc";
const explorerUrl = process.env.NEXT_PUBLIC_ARC_TESTNET_EXPLORER_URL ?? "https://explorer.alta.testnet.arc";

export const arcTestnet = defineChain({
  id: 11155422,
  name: "Arc Testnet (Altar)",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: explorerUrl,
    },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});
