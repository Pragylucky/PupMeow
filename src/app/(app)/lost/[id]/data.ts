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
