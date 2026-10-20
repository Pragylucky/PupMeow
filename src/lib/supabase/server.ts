import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Supabase client for Server Components, Server Actions and Route Handlers (acts as the signed-in user). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Cookie-free anonymous client for cached public reads (OG images, sitemap). */
export function createPublicClient() {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
