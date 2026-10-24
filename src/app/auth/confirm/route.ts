import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createRouteHandlerClient, redirectWithSessionCookies } from "@/lib/supabase/route-handler";
import { safeNext } from "@/lib/redirect";

/** Token-hash email links (use if you customise Supabase email templates — see README). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  if (tokenHash && type) {
    const { supabase, response: sessionResponse } = createRouteHandlerClient(request);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return redirectWithSessionCookies(sessionResponse, `${origin}/auth/callback-done?next=${encodeURIComponent(next)}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
