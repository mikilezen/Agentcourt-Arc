import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";

// Note: `next/font/google` removed to avoid Turbopack internal module errors during build.
// Fonts can be added via `globals.css` or a <link> to Google Fonts if desired.

export const metadata: Metadata = {
  title: "AgentCourt Arc",
  description: "Agent reputation. Onchain. Trustless.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark bg-background`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
