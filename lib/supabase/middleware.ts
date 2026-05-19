import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Lightweight middleware helper that refreshes the demo state session as-needed.
// For App Router handlers, import and call `refreshDemoSession(req)` to ensure
// the server-side Supabase client has the latest credentials/cookies.

export async function refreshDemoSession(req: NextRequest) {
  // Placeholder: currently our demo uses service role key and does not require
  // session refresh. This function exists so you can wire session-handling
  // later (e.g., with @supabase/ssr or auth helpers).
  try {
    const supabase = getSupabaseServerClient();
    // nop: call a light read to ensure connectivity
    await supabase.from("agentcourt_demo_state").select("id").limit(1);
  } catch (err) {
    // don't crash middleware—let callers decide how to handle.
    console.warn("refreshDemoSession failed:", err);
  }
}
