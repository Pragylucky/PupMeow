"use client";

import { useActionState, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { updateProfile, updateNotificationPrefs, deleteAccount } from "@/lib/actions/profile";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { NCR_AREAS } from "@/lib/constants";
import type { ProfilePrivateRow, ProfileRow } from "@/types/database";
import type { ActionResult } from "@/types/models";

function useResultToast(state: ActionResult | null) {
  const toast = useToast();
  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) toast(state.message);
    if (!state.ok) toast(state.error, "error");
  }, [state, toast]);
}

export function ProfileSettingsForm({ profile, priv }: { profile: ProfileRow; priv: ProfilePrivateRow | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  const [uploading, setUploading] = useState(false);
  useResultToast(state);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <ImageUploader bucket="avatars" userId={profile.id} name="avatar_url" label="Profile photo" max={1} shape="circle" value={profile.avatar_url ? [profile.avatar_url] : []} onUploadingChange={setUploading} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" name="display_name" defaultValue={profile.display_name ?? ""} maxLength={50} required error={fe.display_name} />
        <Input label="Username" name="username" defaultValue={profile.username ?? ""} maxLength={20} required error={fe.username} autoCapitalize="none" />
      </div>
      <Combobox name="area" label="Area" options={NCR_AREAS} defaultValue={priv?.home_area ?? profile.area ?? ""} required allowCustom error={fe.area} hint="Used for “Nearby” posts and lost-pet alerts" />
      <Textarea label="Bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={200} rows={3} error={fe.bio} />
      <Input
        label="WhatsApp number"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        defaultValue={priv?.whatsapp ?? ""}
        placeholder="98XXXXXXXX"
        hint="Private. Shared only with owners whose match request you accept (or who accept yours)."
        error={fe.whatsapp}
      />
      <Switch name="hide_area" label="Hide my area" description="Others see only “Delhi NCR” on your profile and new posts" defaultChecked={profile.hide_area} />
      <div>
        <p className="mb-2 text-sm font-bold">Show content for</p>
        <SpeciesToggle />
      </div>
      <Button type="submit" loading={pending} disabled={uploading}>Save profile</Button>
    </form>
  );
}

export function NotificationSettingsForm({ priv }: { priv: ProfilePrivateRow | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateNotificationPrefs, null);
  useResultToast(state);
  const p = priv ?? { notify_likes: true, notify_comments: true, notify_follows: true, notify_mentions: true, notify_matches: true, notify_lost_nearby: true };
  return (
    <form action={action} className="space-y-4">
      <Switch name="notify_lost_nearby" label="Lost pets near me" description="When a pet goes missing in your area" defaultChecked={p.notify_lost_nearby} />
      <Switch name="notify_matches" label="Matchmaking" description="New requests and answers" defaultChecked={p.notify_matches} />
      <Switch name="notify_comments" label="Comments" defaultChecked={p.notify_comments} />
      <Switch name="notify_mentions" label="Mentions" defaultChecked={p.notify_mentions} />
      <Switch name="notify_follows" label="New followers" defaultChecked={p.notify_follows} />
      <Switch name="notify_likes" label="Likes" defaultChecked={p.notify_likes} />
      <Button type="submit" loading={pending}>Save notification settings</Button>
    </form>
  );
}

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteAccount, null);
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <a href="/api/export" className={buttonClasses("outline")} download>
        <Download className="h-4 w-4" aria-hidden /> Download my data
      </a>
      <Button variant="danger-ghost" onClick={() => setOpen(true)}>Delete account</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?" description="This permanently removes your profile, pets, posts, listings, messages and uploaded photos. It can't be undone.">
        <form action={action} className="space-y-4">
          <Input label="Type DELETE to confirm" name="confirm" autoComplete="off" autoCapitalize="characters" error={state && !state.ok ? state.error : undefined} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="danger" loading={pending}>Delete forever</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
