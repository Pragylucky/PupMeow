import { describe, expect, it } from "vitest";
import { canViewHiddenContent, moderationPreviewImage } from "@/lib/moderation/visibility";

describe("canViewHiddenContent", () => {
  const item = { is_hidden: true, author_id: "owner" };

  it("allows public when not hidden", () => {
    expect(canViewHiddenContent({ is_hidden: false, author_id: "owner" }, null)).toBe(true);
  });

  it("blocks strangers when hidden", () => {
    expect(canViewHiddenContent(item, { id: "other", role: "user" })).toBe(false);
  });

  it("allows owner and admin", () => {
    expect(canViewHiddenContent(item, { id: "owner", role: "user" })).toBe(true);
    expect(canViewHiddenContent(item, { id: "mod", role: "admin" })).toBe(true);
  });
});

describe("moderationPreviewImage", () => {
  it("hides image when content is hidden for review", () => {
    expect(moderationPreviewImage({ image: "https://x/y.jpg", hidden: true })).toBeUndefined();
  });
});
