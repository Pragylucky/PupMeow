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

  // Home + login: read session from cookies only (no Auth API round-trip). Avoids 5–30s hangs when
  // Supabase is paused, on bad Wi‑Fi, or the project URL/key is wrong.
  if (pathname === "/" || pathname === "/login") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = safeNext(request.nextUrl.searchParams.get("next"));
      url.search = "";
      return copyCookies(response, NextResponse.redirect(url));
    }
    if (user && pathname === "/") {
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
