import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_PUBLIC, LOST_FOUND_COLUMNS, ADOPTION_COLUMNS } from "@/lib/columns";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** "Download my data" — everything the user owns, as JSON (DPDP Act right to access). */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const uid = auth.user.id;

  const [profile, priv, pets, health, posts, comments, likes, following, followers, lost, adoptions, matchProfiles, matchRequests, notifications, conversations, messages, reports, blocks] =
    await Promise.all([
      supabase.from("profiles").select(PROFILE_PUBLIC).eq("id", uid).maybeSingle(),
      supabase.from("profile_private").select("*").eq("id", uid).maybeSingle(),
      supabase.from("pets").select("*").eq("owner_id", uid),
      supabase.from("pet_health_records").select("*").eq("owner_id", uid),
      supabase.from("posts").select("*").eq("author_id", uid),
      supabase.from("comments").select("*").eq("author_id", uid),
      supabase.from("likes").select("*").eq("user_id", uid),
      supabase.from("follows").select("*").eq("follower_id", uid),
      supabase.from("follows").select("*").eq("following_id", uid),
      supabase.from("lost_found").select(LOST_FOUND_COLUMNS).eq("author_id", uid),
      supabase.from("adoptions").select(ADOPTION_COLUMNS).eq("author_id", uid),
      supabase.from("pet_match_profiles").select("*").eq("owner_id", uid),
      supabase.from("match_requests").select("*").or(`from_owner_id.eq.${uid},to_owner_id.eq.${uid}`),
      supabase.from("notifications").select("*").eq("user_id", uid),
      supabase.from("ai_conversations").select("*").eq("user_id", uid),
      supabase.from("ai_messages").select("*").eq("user_id", uid),
      supabase.from("reports").select("*").eq("reporter_id", uid),
      supabase.from("blocks").select("*").eq("blocker_id", uid),
    ]);

  // Your own contact numbers are protected by column grants; read them with the service role, scoped to you.
  let contacts: { lost_found: unknown; adoptions: unknown } | null = null;
  if (hasServiceRole()) {
    const admin = createAdminClient();
    const [lc, ac] = await Promise.all([
      admin.from("lost_found").select("id, contact_method, contact_value").eq("author_id", uid),
      admin.from("adoptions").select("id, contact_method, contact_value").eq("author_id", uid),
    ]);
    contacts = { lost_found: lc.data, adoptions: ac.data };
  }

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: auth.user.email, created_at: auth.user.created_at },
    profile: profile.data, private_settings: priv.data, pets: pets.data, health_records: health.data,
    posts: posts.data, comments: comments.data, likes: likes.data,
    following: following.data, followers: followers.data,
    lost_found: lost.data, adoptions: adoptions.data,
    match_profiles: matchProfiles.data, match_requests: matchRequests.data,
    notifications: notifications.data, ai_conversations: conversations.data, ai_messages: messages.data,
    reports_filed: reports.data, blocked_users: blocks.data,
    listing_contacts: contacts,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pupmeow-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
