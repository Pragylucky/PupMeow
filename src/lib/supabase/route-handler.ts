import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/** Route Handlers: read the session from the incoming request cookies (more reliable than cookies() alone). */
export function createSupabaseFromRequest(request: NextRequest): SupabaseClient {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });
}

/** Supabase client for Route Handlers that exchange codes or set session cookies on redirects. */
export function createRouteHandlerClient(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response };
}

export function redirectWithSessionCookies(from: NextResponse, url: string | URL) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirect.cookies.set({ name, value, ...options });
  });
  return redirect;
}
