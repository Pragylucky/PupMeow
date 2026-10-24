import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient, redirectWithSessionCookies } from "@/lib/supabase/route-handler";
import { ensureProfileForUser } from "@/lib/auth/ensure-profile";
import { resolvePostSignInPath } from "@/lib/auth/post-sign-in";
import { safeNext } from "@/lib/redirect";

/** Google OAuth and email magic-link (PKCE) callback. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (searchParams.get("error") || searchParams.get("error_description")) {
    console.warn("[auth/callback] oauth error", searchParams.get("error"), searchParams.get("error_description"));
    return NextResponse.redirect(`${origin}/login?error=oauth_denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { supabase, response: sessionResponse } = createRouteHandlerClient(request);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback]", error?.code, error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  await ensureProfileForUser(data.user);
  const path = await resolvePostSignInPath(supabase, data.user.id, next);
  return redirectWithSessionCookies(sessionResponse, `${origin}${path}`);
}
