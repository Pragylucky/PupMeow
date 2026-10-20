import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient, redirectWithSessionCookies } from "@/lib/supabase/route-handler";
import { resolvePostSignInPath } from "@/lib/auth/post-sign-in";
import { safeNext } from "@/lib/redirect";

/** After `/auth/confirm` (custom email templates), finish routing once the session exists. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const { supabase, response: sessionResponse } = createRouteHandlerClient(request);
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(`${origin}/login`);
  const path = await resolvePostSignInPath(supabase, data.user.id, next);
  return redirectWithSessionCookies(sessionResponse, `${origin}${path}`);
}
