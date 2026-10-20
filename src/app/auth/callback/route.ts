import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient, redirectWithSessionCookies } from "@/lib/supabase/route-handler";
import { resolvePostSignInPath } from "@/lib/auth/post-sign-in";
import { safeNext } from "@/lib/redirect";

const LOGIN_ERROR = "That sign-in link has expired or was opened in a different browser. Please try Continue with Google again.";

/** Google OAuth and email magic-link (PKCE) callback. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(LOGIN_ERROR)}`);
  }

  const { supabase, response: sessionResponse } = createRouteHandlerClient(request);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback]", error?.code, error?.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(LOGIN_ERROR)}`);
  }

  const path = await resolvePostSignInPath(supabase, data.user.id, next);
  return redirectWithSessionCookies(sessionResponse, `${origin}${path}`);
}
