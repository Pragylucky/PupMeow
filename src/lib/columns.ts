/**
 * Explicit column lists. Some tables use column-level grants (contact numbers, AI counters
 * and embeddings are not selectable by clients), so `select("*")` would fail on them.
 */
export const PROFILE_PUBLIC =
  "id, username, display_name, avatar_url, city, area, bio, role, is_banned, hide_area, species_pref, onboarded, created_at, updated_at";
export const MINI_PROFILE = "id, username, display_name, avatar_url";
export const MINI_PET = "id, name, species, photo_url";

export const LOST_FOUND_COLUMNS =
  "id, author_id, type, pet_name, species, breed, color, gender, description, photo_urls, last_seen_area, landmark, last_seen_date, contact_method, reward_text, status, reunited_at, city, is_hidden, created_at, updated_at";

export const ADOPTION_COLUMNS =
  "id, author_id, pet_name, species, breed, age_text, age_months, gender, vaccinated, neutered, description, photo_urls, city, area, is_ngo, org_name, contact_method, status, adopted_at, is_hidden, created_at, updated_at";

export const POST_WITH_RELATIONS = `*, author:profiles!posts_author_id_fkey(${MINI_PROFILE}), pet:pets(${MINI_PET})`;
