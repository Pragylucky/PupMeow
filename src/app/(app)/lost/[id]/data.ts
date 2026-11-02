import "server-only";
import { cache } from "react";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { LOST_FOUND_COLUMNS, MINI_PROFILE } from "@/lib/columns";
import type { LostFoundRow } from "@/types/database";
import type { MiniProfile } from "@/types/models";

export type LostFoundDetail = LostFoundRow & { author: MiniProfile | null };

export const getLostFound = cache(async (id: string, publicOnly = false): Promise<LostFoundDetail | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = publicOnly ? createPublicClient() : await createClient();
  const { data } = await supabase.from("lost_found").select(`${LOST_FOUND_COLUMNS}, author:profiles!lost_found_author_id_fkey(${MINI_PROFILE})`).eq("id", id).maybeSingle();
  return (data as LostFoundDetail | null) ?? null;
});

export function lostHeadline(item: Pick<LostFoundRow, "type" | "status" | "pet_name" | "breed" | "species" | "last_seen_area">) {
  const label = item.status === "reunited" ? "REUNITED" : item.type === "lost" ? "LOST" : "FOUND";
  const who = [item.pet_name, item.breed ?? (item.species === "dog" ? "Dog" : "Cat")].filter(Boolean).join(", ");
  const where = item.type === "lost" ? `last seen ${item.last_seen_area}` : `found in ${item.last_seen_area}`;
  return `${label}: ${who}, ${where}`;
}

/**
 * The report's phone number, only for the signed-in author (used for the optional number on their poster).
 * Everyone else, and anyone signed out, gets null, so a shared poster link can never reveal it.
 */
export async function getOwnerPhone(item: Pick<LostFoundRow, "id" | "author_id">): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== item.author_id) return null;
  const { data } = await supabase.rpc("get_lost_found_contact", { p_id: item.id });
  const row = (data as { contact_value: string }[] | null)?.[0];
  return row?.contact_value ?? null;
}
