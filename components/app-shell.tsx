"use client";

import { ReactNode, useState } from "react";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/80 lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform lg:hidden ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenSidebar={() => setOpen(true)} />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
