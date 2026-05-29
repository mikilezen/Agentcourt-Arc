"use client";

import { useEffect } from "react";

function isWalletExtensionNoise(reason: unknown) {
  const message =
    reason instanceof Error
      ? `${reason.message} ${reason.cause instanceof Error ? reason.cause.message : ""}`
      : String(reason);

  return (
    message.includes("Failed to connect to MetaMask") ||
    message.includes("MetaMask extension not found") ||
    message.includes("Unchecked runtime.lastError") ||
    message.includes("No tab with id") ||
    message.includes("Unexpected error") ||
    message.includes("chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa")
  );
}

export function WalletErrorGuard() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (
        isWalletExtensionNoise(event.error ?? event.message) &&
        (event.filename.startsWith("chrome-extension://") || event.filename === "")
      ) {
        event.preventDefault();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isWalletExtensionNoise(event.reason)) {
        event.preventDefault();
      }
    };

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.error = (...args: unknown[]) => {
      if (args.some(isWalletExtensionNoise)) {
        return;
      }

      originalConsoleError(...args);
    };

    console.warn = (...args: unknown[]) => {
      if (args.some(isWalletExtensionNoise)) {
        return;
      }

      originalConsoleWarn(...args);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
