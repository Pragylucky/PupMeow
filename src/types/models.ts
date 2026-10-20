import type {
  AdoptionRow, LostFoundRow, MatchProfileRow, MatchRequestRow, NotificationRow, PetRow, PostRow,
  ProfileRow, CommentRow,
} from "./database";

export type MiniProfile = Pick<ProfileRow, "id" | "username" | "display_name" | "avatar_url">;
export type MiniPet = Pick<PetRow, "id" | "name" | "species" | "photo_url">;

export type FeedPost = PostRow & {
  author: MiniProfile | null;
  pet: MiniPet | null;
  liked_by_me: boolean;
};

export type CommentWithAuthor = CommentRow & { author: MiniProfile | null };

export type LostFoundCard = LostFoundRow & { author: MiniProfile | null };
export type AdoptionCard = AdoptionRow & { author: MiniProfile | null };

export type MatchProfileCard = MatchProfileRow & {
  pet: Pick<PetRow, "id" | "name" | "species" | "breed" | "gender" | "birthday" | "photo_url" | "is_neutered"> | null;
  owner: MiniProfile | null;
};

export type MatchRequestWithPets = MatchRequestRow & {
  from_pet: MiniPet | null;
  to_pet: MiniPet | null;
  from_owner: MiniProfile | null;
  to_owner: MiniProfile | null;
};

export type NotificationWithActor = NotificationRow & { actor: MiniProfile | null };

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
