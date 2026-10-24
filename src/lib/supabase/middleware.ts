import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/redirect";

/** Paths that need a signed-in user. Everything else is public. */
const PROTECTED_PREFIXES = [
  "/home",
  "/feed",
  "/post/new",
  "/search",
  "/notifications",
  "/pets",
  "/assistant",
  "/settings",
  "/onboarding",
  "/admin",
  "/match",
  "/lost/new",
  "/adopt/new",
  "/tag",
  "/suspended",
];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Auth callbacks must exchange codes before middleware touches session cookies / PKCE state. */
function isAuthCallbackPath(pathname: string) {
  return pathname === "/auth/callback" || pathname === "/auth/confirm";
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthCallbackPath(pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  if (!env.supabaseUrl || !env.supabaseAnonKey) return response;

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Public listing/share pages don't need Auth API calls — saves Supabase quota on traffic spikes.
  if (!isProtectedPath(pathname) && pathname !== "/" && pathname !== "/login") {
    return response;
  }

  const { search } = request.nextUrl;

  // Home + login: skip auth entirely when there is no session cookie (most landing traffic).
  if ((pathname === "/" || pathname === "/login") && !hasSupabaseAuthCookies(request)) {
    return response;
  }

  // Home + login: validate JWT with Supabase (same as app routes). Stale cookies caused /login ↔ /home loops.
  if (pathname === "/" || pathname === "/login") {
    const user = await Promise.race([
      supabase.auth.getUser().then(({ data }) => data.user ?? null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
    ]);

    if (!user) {
      if (hasSupabaseAuthCookies(request)) {
        return clearSupabaseAuthCookies(request, response);
      }
      return response;
    }

    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = safeNext(request.nextUrl.searchParams.get("next"));
      url.search = "";
      return copyCookies(response, NextResponse.redirect(url));
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      url.search = "";
      return copyCookies(response, NextResponse.redirect(url));
    }
    return response;
  }

  // App routes: validate JWT with Supabase (refreshes session when possible), with a hard timeout.
  const user = await Promise.race([
    supabase.auth.getUser().then(({ data }) => data.user ?? null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
  ]);

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return copyCookies(response, NextResponse.redirect(url));
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}

function hasSupabaseAuthCookies(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.includes("-auth-token") || (c.name.startsWith("sb-") && c.name.includes("auth")));
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const cleared = NextResponse.next({ request });
  response.cookies.getAll().forEach((c) => cleared.cookies.set(c));
  request.cookies.getAll().forEach((c) => {
    if (c.name.includes("-auth-token") || (c.name.startsWith("sb-") && c.name.includes("auth"))) {
      cleared.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
  });
  return cleared;
}
