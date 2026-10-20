"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/** Singleton Supabase client for Client Components. */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
