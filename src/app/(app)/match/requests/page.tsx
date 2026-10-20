import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MINI_PET, MINI_PROFILE } from "@/lib/columns";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { RequestCard } from "./request-card";
import type { MatchRequestWithPets } from "@/types/models";

export const metadata: Metadata = { title: "Playdate requests", robots: { index: false } };

export default async function MyMatchesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const raw = (await searchParams).tab ?? "";
  const tab = ["received", "sent", "accepted"].includes(raw) ? raw : "received";
  const profile = await requireProfile("/match/requests");
  const supabase = await createClient();
  const sel = `*, from_pet:pets!match_requests_from_pet_id_fkey(${MINI_PET}), to_pet:pets!match_requests_to_pet_id_fkey(${MINI_PET}), from_owner:profiles!match_requests_from_owner_id_fkey(${MINI_PROFILE}), to_owner:profiles!match_requests_to_owner_id_fkey(${MINI_PROFILE})`;
  let q = supabase.from("match_requests").select(sel).order("created_at", { ascending: false }).limit(100);
  if (tab === "received") q = q.eq("to_owner_id", profile.id).neq("status", "accepted");
  if (tab === "sent") q = q.eq("from_owner_id", profile.id).neq("status", "accepted");
  if (tab === "accepted") q = q.eq("status", "accepted").or(`from_owner_id.eq.${profile.id},to_owner_id.eq.${profile.id}`);
  const [{ data }, { count: waiting }] = await Promise.all([
    q,
    supabase.from("match_requests").select("id", { count: "exact", head: true }).eq("to_owner_id", profile.id).eq("status", "pending"),
  ]);
  const items = (data ?? []) as MatchRequestWithPets[];
  return (
    <WithRail
      rail={
        <TipCard tone="play" title="After you match">
          <Steps items={["Say hi on WhatsApp and pick a public park.", "Add the playdate to your calendar.", "Go slow: short first meet, leashes on, lots of treats."]} />
        </TipCard>
      }
    >
      <Link href="/match" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> Playdates</Link>
      <h1 className="mb-4 text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">Playdate requests</h1>
      <Tabs ariaLabel="Requests" value={tab} className="mb-4" items={[
        { value: "received", label: "Received", href: "/match/requests?tab=received", count: waiting ?? 0 },
        { value: "sent", label: "Sent", href: "/match/requests?tab=sent" },
        { value: "accepted", label: "Matched", href: "/match/requests?tab=accepted" },
      ]} />
      {items.length ? (
        <ul className="space-y-3">{items.map((r) => <li key={r.id}><RequestCard request={r} viewerId={profile.id} /></li>)}</ul>
      ) : (
        <EmptyState tone="card" art="heart" title={tab === "accepted" ? "No matches yet" : tab === "sent" ? "You haven't sent any requests" : "No requests yet"} description="Browse pets nearby and say hello." action={<ButtonLink href="/match">Find a playdate</ButtonLink>} />
      )}
    </WithRail>
  );
}
