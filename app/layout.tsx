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
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
