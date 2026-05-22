"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";

import { arcTestnet } from "@/lib/chain";
import { WalletErrorGuard } from "@/components/wallet-error-guard";

export const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected({ unstable_shimAsyncInject: 1000 })],
  transports: {
    [arcTestnet.id]: http(),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletErrorGuard />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
