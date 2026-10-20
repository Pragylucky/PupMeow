/**
 * Database types for Pupmeow.
 *
 * Hand-maintained to mirror supabase/migrations. After you link a Supabase project you can
 * regenerate the official version with:  SUPABASE_PROJECT_ID=xxxx npm run db:types
 * (requires the Supabase CLI: `npm i -g supabase` and `supabase login`).
 */
export type Species = "dog" | "cat";
export type SpeciesPref = Species | "both";
export type PetGender = "male" | "female" | "unknown";
export type UserRole = "user" | "admin";
export type HealthRecordType = "vaccination" | "medication" | "vet_visit" | "weight";
export type LostFoundType = "lost" | "found";
export type LostFoundStatus = "open" | "reunited";
export type ContactMethod = "whatsapp" | "phone";
export type AdoptionStatus = "available" | "adopted";
export type MatchPurpose = "playdate" | "breeding" | "both";
export type MatchStatus = "pending" | "accepted" | "declined";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type ReportTarget = "post" | "comment" | "profile" | "lost_found" | "adoption" | "match_profile";
export type ReportReason = "spam" | "abuse" | "animal_cruelty" | "scam_selling" | "fake_listing" | "other" | "ai_flag";
export type NotificationType =
  | "like" | "comment" | "follow" | "mention" | "match_request" | "match_accepted"
  | "match_declined" | "lost_nearby" | "lost_match" | "system";

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string;
  area: string | null;
  bio: string | null;
  role: UserRole;
  is_banned: boolean;
  hide_area: boolean;
  species_pref: SpeciesPref;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfilePrivateRow {
  id: string;
  home_area: string | null;
  whatsapp: string | null;
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
  notify_mentions: boolean;
  notify_matches: boolean;
  notify_lost_nearby: boolean;
  created_at: string;
  updated_at: string;
}

export interface PetRow {
  id: string;
  owner_id: string;
  name: string;
  species: Species;
  breed: string | null;
  gender: PetGender;
  birthday: string | null;
  weight_kg: number | null;
  photo_url: string | null;
  photo_urls: string[];
  bio: string | null;
  is_neutered: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthRecordRow {
  id: string;
  pet_id: string;
  owner_id: string;
  type: HealthRecordType;
  title: string;
  date: string;
  next_due_date: string | null;
  weight_kg: number | null;
  notes: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  author_id: string;
  pet_id: string | null;
  species: Species | null;
  caption: string;
  image_urls: string[];
  hashtags: string[];
  mentions: string[];
  city: string | null;
  area: string | null;
  is_hidden: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface LostFoundRow {
  id: string;
  author_id: string;
  type: LostFoundType;
  pet_name: string | null;
  species: Species;
  breed: string | null;
  color: string | null;
  gender: PetGender;
  description: string;
  photo_urls: string[];
  last_seen_area: string;
  landmark: string | null;
  last_seen_date: string;
  contact_method: ContactMethod;
  reward_text: string | null;
  status: LostFoundStatus;
  reunited_at: string | null;
  city: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdoptionRow {
  id: string;
  author_id: string;
  pet_name: string;
  species: Species;
  breed: string | null;
  age_text: string;
  age_months: number | null;
  gender: PetGender;
  vaccinated: boolean;
  neutered: boolean;
  description: string;
  photo_urls: string[];
  city: string;
  area: string;
  is_ngo: boolean;
  org_name: string | null;
  contact_method: ContactMethod;
  status: AdoptionStatus;
  adopted_at: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchProfileRow {
  id: string;
  pet_id: string;
  owner_id: string;
  looking_for: MatchPurpose;
  has_papers: boolean;
  health_confirmed: boolean;
  about: string;
  photo_urls: string[];
  area: string;
  health_doc_path: string | null;
  is_active: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchRequestRow {
  id: string;
  from_pet_id: string;
  to_pet_id: string;
  from_owner_id: string;
  to_owner_id: string;
  purpose: Exclude<MatchPurpose, "both">;
  message: string | null;
  status: MatchStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AiConversationRow {
  id: string;
  user_id: string;
  title: string;
  pet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string | null;
  target_type: ReportTarget;
  target_id: string;
  target_owner_id: string | null;
  reason: ReportReason;
  details: string | null;
  ai_reason: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockRow {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}
