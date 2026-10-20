import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAiAssistantEnabled } from "@/lib/ai/config";
import { FormPage } from "@/components/layout/page-layout";
import { PetForm } from "@/components/features/pets/pet-form";
import { DeletePetButton } from "./delete-pet-button";
import type { PetRow } from "@/types/database";

export const metadata: Metadata = { title: "Edit pet", robots: { index: false } };

export default async function EditPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile(`/pets/${id}/edit`);
  const supabase = await createClient();
  const { data } = await supabase.from("pets").select("*").eq("id", id).eq("owner_id", profile.id).maybeSingle();
  if (!data) notFound();
  const pet = data as PetRow;
  return (
    <FormPage
      title={`Edit ${pet.name}`}
      back={<Link href={`/pet/${pet.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> {pet.name}</Link>}
      description={<span className="flex flex-wrap items-center gap-2">Changes show on {pet.name}&apos;s page right away. <DeletePetButton petId={pet.id} name={pet.name} /></span>}
    >
      <PetForm userId={profile.id} pet={pet} aiEnabled={isAiAssistantEnabled()} />
    </FormPage>
  );
}
