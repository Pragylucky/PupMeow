import "server-only";
import { cache } from "react";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { ADOPTION_COLUMNS, MINI_PROFILE } from "@/lib/columns";
import type { AdoptionRow } from "@/types/database";
import type { MiniProfile } from "@/types/models";

export type AdoptionDetail = AdoptionRow & { author: MiniProfile | null };

export const getAdoption = cache(async (id: string, publicOnly = false): Promise<AdoptionDetail | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = publicOnly ? createPublicClient() : await createClient();
  const { data } = await supabase.from("adoptions").select(`${ADOPTION_COLUMNS}, author:profiles!adoptions_author_id_fkey(${MINI_PROFILE})`).eq("id", id).maybeSingle();
  return (data as AdoptionDetail | null) ?? null;
});
