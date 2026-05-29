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
  fees: {
    estimateFeesPerGas: async ({ client, multiply, type, block }) => {
      if (type === "legacy") {
        const gasPrice = await client.getGasPrice().catch(() => 1_000_000_000n);
        return {
          gasPrice: multiply(gasPrice),
        };
      }

      const baseFeePerGas = block.baseFeePerGas ?? (await client.getGasPrice().catch(() => 1_000_000_000n));
      const maxPriorityFeePerGas = await client
        .estimateMaxPriorityFeePerGas()
        .catch(() => 1_000_000n);

      return {
        maxFeePerGas: multiply(baseFeePerGas) + maxPriorityFeePerGas,
        maxPriorityFeePerGas,
      };
    },
    maxPriorityFeePerGas: async ({ client }) => {
      return client.estimateMaxPriorityFeePerGas().catch(() => 1_000_000n);
    },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});
