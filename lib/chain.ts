import { createPublicClient, defineChain, http } from "viem";

const configuredRpcUrl = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL;
const rpcUrl =
  configuredRpcUrl && !configuredRpcUrl.includes("<key>") && !configuredRpcUrl.includes("your-canteen-key")
    ? configuredRpcUrl
    : "https://rpc.testnet.arc.network";
const explorerUrl = process.env.NEXT_PUBLIC_ARC_TESTNET_EXPLORER_URL ?? "https://testnet.arcscan.app";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
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
