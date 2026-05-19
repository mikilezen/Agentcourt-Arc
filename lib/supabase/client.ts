"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !key) {
  // Fail loudly in development to help the developer configure envs.
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment.");
}

export const supabaseClient = createClient(url, key);

export default supabaseClient;
