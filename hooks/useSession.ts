"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

type SessionState = {
  address: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export function useSession(): SessionState & {
  refetch: () => Promise<void>;
} {
  const { address: wagmiAddress } = useAccount();
  const [state, setState] = useState<SessionState>({
    address: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refetch = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      setState({
        address: data.address ?? null,
        isAuthenticated: Boolean(data.authenticated),
        isLoading: false,
      });
    } catch {
      setState({ address: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch, wagmiAddress]);

  useEffect(() => {
    const handler = () => void refetch();
    window.addEventListener("agentcourt:session-changed", handler);
    return () => window.removeEventListener("agentcourt:session-changed", handler);
  }, [refetch]);

  return { ...state, refetch };
}
