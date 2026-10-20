import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAiEnabled } from "@/lib/ai/config";
import { FormPage } from "@/components/layout/page-layout";
import { TipCard } from "@/components/brand/bits";
import { CreatePostForm } from "./create-post-form";
import type { PetRow } from "@/types/database";

export const metadata: Metadata = { title: "New post", robots: { index: false } };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ caption?: string }> }) {
  const initialCaption = ((await searchParams).caption ?? "").slice(0, 1000);
  const profile = await requireProfile("/post/new");
  const supabase = await createClient();
  const { data: pets } = await supabase.from("pets").select("id, name, species, photo_url").eq("owner_id", profile.id).order("name");
  return (
    <FormPage
      title="Share a moment"
      description="Photos of your pet, a neighbourhood update or a care tip. Up to 6 photos."
      rail={
        <TipCard tone="care" title="Make it a good one">
          <ul className="space-y-2 text-[0.95rem] font-semibold text-white/90">
            <li>Tag your pet so they get their own page of moments.</li>
            <li>#DogsOfDelhi #CatsOfDelhi #Indie help people find you.</li>
            <li>Missing pet? Use Report lost instead. It alerts your area.</li>
          </ul>
        </TipCard>
      }
    >
      <CreatePostForm profile={profile} pets={(pets ?? []) as Pick<PetRow, "id" | "name" | "species" | "photo_url">[]} aiEnabled={isAiEnabled()} initialCaption={initialCaption} />
    </FormPage>
  );
}
