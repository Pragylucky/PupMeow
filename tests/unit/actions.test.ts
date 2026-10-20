import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/ai/moderation", () => ({
  moderateText: vi.fn(async (t: string) => (t.includes("BAD") ? { verdict: "block", categories: ["abuse"], reason: "x" } : { verdict: "allow", categories: [], reason: "" })),
  blockedMessage: () => "Please keep it kind",
  flagForReview: vi.fn(),
}));

const USER = "11111111-1111-4111-8111-111111111111";
const insert = vi.fn();
const fakeSupabase = {
  from: vi.fn(() => ({
    insert: (row: unknown) => { insert(row); return { select: () => ({ single: async () => ({ data: { id: "22222222-2222-4222-8222-222222222222" }, error: null }) }), error: null }; },
  })),
};
const ctx = { current: null as null | { error: string } | { supabase: typeof fakeSupabase; userId: string; profile: Record<string, unknown> } };
vi.mock("@/lib/auth", () => ({ actionContext: vi.fn(async () => ctx.current) }));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  insert.mockClear();
  ctx.current = { supabase: fakeSupabase, userId: USER, profile: { city: "Delhi NCR", area: "Dwarka", hide_area: false } };
});

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};

describe("createPost", () => {
  it("requires sign-in", async () => {
    ctx.current = { error: "Please sign in first." };
    const { createPost } = await import("@/lib/actions/posts");
    expect(await createPost(null, fd({ caption: "hi" }))).toEqual({ ok: false, error: "Please sign in first." });
  });
  it("rejects images from another user's folder", async () => {
    const { createPost } = await import("@/lib/actions/posts");
    const other = "https://abc.supabase.co/storage/v1/object/public/posts/99999999-9999-4999-8999-999999999999/x.webp";
    const res = await createPost(null, fd({ caption: "hi", image_urls: [other] }));
    expect(res.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
  it("blocks content that fails moderation", async () => {
    const { createPost } = await import("@/lib/actions/posts");
    const res = await createPost(null, fd({ caption: "BAD words" }));
    expect(res.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
  it("inserts as the signed-in user with area from the profile", async () => {
    const { createPost } = await import("@/lib/actions/posts");
    const res = await createPost(null, fd({ caption: "Monsoon walk #DogsOfDelhi" }));
    expect(res.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ author_id: USER, area: "Dwarka", city: "Delhi NCR" }));
  });
});

describe("submitReport", () => {
  it("validates the reason", async () => {
    const { submitReport } = await import("@/lib/actions/reports");
    const res = await submitReport(null, fd({ target_type: "post", target_id: USER }));
    expect(res.ok).toBe(false);
  });
  it("files a report as the current user", async () => {
    const { submitReport } = await import("@/lib/actions/reports");
    fakeSupabase.from.mockImplementationOnce(() => ({ insert: async (row: unknown) => { insert(row); return { error: null }; } }) as never);
    const res = await submitReport(null, fd({ target_type: "post", target_id: USER, reason: "spam" }));
    expect(res.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ reporter_id: USER, reason: "spam" }));
  });
});
