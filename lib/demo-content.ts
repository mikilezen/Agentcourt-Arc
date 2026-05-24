import { unstable_noStore } from "next/cache";

import { getSupabaseReadClient } from "@/lib/supabase/server";

const CONTENT_TABLE = "agentcourt_demo_content";

type DemoContentRow = {
  key: string;
  data: unknown;
};

type SupabaseError = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

function formatSupabaseError(error: SupabaseError, fallback: string): string {
  if (error.code === "42P01") {
    return "Missing agentcourt_demo_content table. Run db/supabase_demo_tables.sql in Supabase SQL editor.";
  }

  if (error.code === "PGRST205") {
    return "Schema cache missing agentcourt_demo_content. Run db/supabase_demo_tables.sql and reload Supabase API schema.";
  }

  const parts = [error.message, error.details, error.hint, error.code].filter(
    (part): part is string => typeof part === "string" && part.length > 0
  );

  return parts.length > 0 ? parts.join(" | ") : fallback;
}

export async function fetchDemoContent<T>(key: string): Promise<T | null> {
  unstable_noStore();

  try {
    const supabase = getSupabaseReadClient();
    if (!supabase) {
      return null;
    }

    const result = await supabase
      .from(CONTENT_TABLE)
      .select("key, data")
      .eq("key", key)
      .maybeSingle<DemoContentRow>();

    if (result.error) {
      throw new Error(formatSupabaseError(result.error, "Failed to load demo content."));
    }

    return (result.data?.data as T | null) ?? null;
  } catch (error) {
    console.error(`Failed to fetch demo content for key ${key}:`, error);
    return null;
  }
}
