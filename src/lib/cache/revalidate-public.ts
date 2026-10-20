import "server-only";
import { revalidateTag } from "next/cache";
import { ADOPT_LIST_TAG, LANDING_TAG, LOST_LIST_TAG } from "@/lib/cache/public-listings";

export function revalidatePublicListingCaches() {
  revalidateTag(LANDING_TAG);
  revalidateTag(LOST_LIST_TAG);
  revalidateTag(ADOPT_LIST_TAG);
}
