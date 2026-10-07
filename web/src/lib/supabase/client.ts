"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";

let browserClient: ReturnType<typeof createSupabaseClient<Database>> | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured. Add the public project URL and publishable key.");
  }

  browserClient ??= createSupabaseClient<Database>(url, key);
  return browserClient;
}
