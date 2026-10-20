"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Eye, Pencil } from "lucide-react";
import { createPost } from "@/lib/actions/posts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { RadioGroup } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/toast";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { WriteForMe } from "@/components/features/ai/write-for-me";
import { PostCard } from "@/components/features/feed/post-card";
import type { PetRow, ProfileRow } from "@/types/database";
import type { ActionResult } from "@/types/models";

export function CreatePostForm({ profile, pets, aiEnabled, initialCaption = "" }: { profile: ProfileRow; pets: Pick<PetRow, "id" | "name" | "species" | "photo_url">[]; aiEnabled: boolean; initialCaption?: string }) {
  const [state, action, pending] = useActionState<ActionResult<string> | null, FormData>(createPost, null);
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState(initialCaption);
  const [petId, setPetId] = useState("");
  const [species, setSpecies] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const pet = pets.find((p) => p.id === petId) ?? null;

  useEffect(() => {
    if (state?.ok && state.data) { toast("Posted! 🐾"); router.push(`/post/${state.data}`); }
    if (state && !state.ok) setPreview(false);
  }, [state, router, toast]);

  const empty = !caption.trim() && images.length === 0;

  return (
    <form action={action} className="space-y-5">
      {images.map((u) => <input key={u} type="hidden" name="image_urls" value={u} />)}
      <input type="hidden" name="caption" value={caption} />
      <input type="hidden" name="pet_id" value={petId} />
      <input type="hidden" name="species" value={pet ? "" : species} />
      {state && !state.ok && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>}

      <div className={preview ? "hidden" : "space-y-5"}>
        <ImageUploader bucket="posts" userId={profile.id} label="Photos" hint="Up to 6 photos. Drag to reorder." max={6} value={images} onChange={setImages} onUploadingChange={setUploading} />
        <Textarea
          label="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={1000}
          rows={5}
          placeholder="What's your pet up to? Use #hashtags and @mention friends"
          error={state && !state.ok ? state.fieldErrors?.caption : undefined}
          action={aiEnabled ? (
            <WriteForMe kind="post_caption" getDetails={() => [pet ? `Pet: ${pet.name} (${pet.species})` : "", caption].filter(Boolean).join("\n")} onDraft={setCaption} />
          ) : undefined}
        />
        {pets.length > 0 && (
          <Select label="Tag a pet" value={petId} onChange={(e) => setPetId(e.target.value)} placeholder="No pet tagged" options={pets.map((p) => ({ value: p.id, label: `${p.name}` }))} />
        )}
        {!pet && (
          <RadioGroup name="species_choice" legend="This post is about" value={species} onChange={setSpecies} columns={3}
            options={[{ value: "dog", label: "Dogs" }, { value: "cat", label: "Cats" }, { value: "", label: "General" }]} />
        )}
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-4 w-4" aria-hidden />
          {profile.hide_area || !profile.area ? "Posting to Delhi NCR (area hidden)" : `Posting from ${profile.area}`}
        </p>
      </div>

      {preview && (
        <div aria-live="polite">
          <p className="mb-2 text-sm font-bold text-muted">Preview</p>
          <PostCard
            viewerId={null}
            full
            post={{
              id: "preview", author_id: profile.id, pet_id: petId || null, species: null, caption, image_urls: images, hashtags: [], mentions: [],
              city: profile.city, area: profile.hide_area ? null : profile.area, is_hidden: false, like_count: 0, comment_count: 0,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              author: { id: profile.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url },
              pet: pet ? { id: pet.id, name: pet.name, species: pet.species, photo_url: pet.photo_url } : null, liked_by_me: false,
            }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {preview ? (
          <>
            <Button variant="outline" onClick={() => setPreview(false)}><Pencil className="h-4 w-4" aria-hidden /> Edit</Button>
            <Button type="submit" size="lg" loading={pending}>Post</Button>
          </>
        ) : (
          <Button size="lg" disabled={empty || uploading} onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4" aria-hidden /> {uploading ? "Uploading…" : "Preview"}
          </Button>
        )}
      </div>
    </form>
  );
}
