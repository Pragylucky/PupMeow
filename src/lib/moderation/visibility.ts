import type { ProfileRow } from "@/types/database";

/** Hidden listings are visible only to the owner and admins (not the public or other members). */
export function canViewHiddenContent(
  item: { is_hidden: boolean; author_id: string },
  viewer: Pick<ProfileRow, "id" | "role"> | null,
): boolean {
  if (!item.is_hidden) return true;
  if (!viewer) return false;
  if (viewer.id === item.author_id) return true;
  return viewer.role === "admin";
}

/** Admin queue: do not show photos for content hidden for review. */
export function moderationPreviewImage(preview: { image?: string; hidden: boolean } | undefined): string | undefined {
  if (!preview?.image || preview.hidden) return undefined;
  return preview.image;
}
