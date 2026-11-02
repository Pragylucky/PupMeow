import { beforeEach, describe, expect, it, vi } from "vitest";

const tables: Record<string, unknown[]> = {};
const inserted: Record<string, unknown[]> = {};
function query(table: string) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "lte", "in", "order", "limit"]) q[m] = () => q;
  q.insert = async (rows: unknown[]) => ((inserted[table] ??= []).push(...rows), { error: null });
  q.then = (resolve: (v: unknown) => void) => resolve({ data: tables[table] ?? [], error: null });
  return q;
}
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: query }) }));
const sendPushToUsers = vi.fn();
vi.mock("@/lib/push", () => ({ sendPushToUsers: (...a: unknown[]) => sendPushToUsers(...a) }));

const { followUpMessage, sendLostFollowUps } = await import("@/lib/lost-followups");
const { formatPhone, lostShareText, posterFilename } = await import("@/lib/lost-share");

// 5 Nov 2026, 09:00 India time.
const NOW = new Date("2026-11-05T03:30:00Z");
const daysAgo = (n: number, hourIst = 11) => new Date(Date.parse(`2026-11-05T00:00:00+05:30`) - n * 86_400_000 + hourIst * 3_600_000).toISOString();

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(inserted)) delete inserted[k];
  sendPushToUsers.mockReset().mockResolvedValue(1);
});

describe("followUpMessage", () => {
  it("escalates with time", () => {
    expect(followUpMessage("Bruno", 1)).toMatch(/Still looking for Bruno/);
    expect(followUpMessage("Bruno", 3)).toMatch(/missing for 3 days/);
    expect(followUpMessage("Bruno", 7)).toMatch(/been a week/);
  });
});

describe("sendLostFollowUps", () => {
  beforeEach(() => {
    tables.lost_found = [
      { id: "l1", author_id: "u1", pet_name: "Bruno", species: "dog", created_at: daysAgo(1) },
      { id: "l2", author_id: "u2", pet_name: null, species: "cat", created_at: daysAgo(3, 1) }, // posted at 1 AM IST: still day 3 in India
      { id: "l3", author_id: "u3", pet_name: "Mithu", species: "cat", created_at: daysAgo(2) }, // not a milestone day
      { id: "l4", author_id: "u4", pet_name: "Rocky", species: "dog", created_at: daysAgo(7) }, // owner turned reminders off
      { id: "l5", author_id: "u5", pet_name: "Sheru", species: "dog", created_at: daysAgo(7) }, // banned
    ];
    tables.profile_private = [{ id: "u1" }, { id: "u2" }, { id: "u3" }, { id: "u5" }];
    tables.profiles = [{ id: "u5" }];
  });

  it("messages owners on day 1, 3 and 7 only, respecting preferences and bans", async () => {
    const r = await sendLostFollowUps(NOW);
    const rows = inserted.notifications as { user_id: string; entity_id: string; entity_type: string; type: string; message: string }[];
    expect(rows.map((x) => x.entity_id).sort()).toEqual(["l1", "l2"]);
    expect(rows.every((x) => x.type === "reminder" && x.entity_type === "lost_found")).toBe(true);
    expect(rows.find((x) => x.entity_id === "l2")?.message).toMatch(/your cat has been missing for 3 days/);
    expect(r).toEqual({ notified: 2, pushed: 1 });
  });

  it("links the push to the share-again view", async () => {
    await sendLostFollowUps(NOW);
    const payloads = sendPushToUsers.mock.calls[0][0] as Map<string, { url: string; title: string }>;
    expect(payloads.get("u1")).toMatchObject({ url: "/lost/l1?share=1", title: "🐾 Bruno is still missing" });
  });

  it("doesn't repeat today's follow-up on a cron retry", async () => {
    tables.notifications = [{ user_id: "u1", entity_id: "l1" }];
    await sendLostFollowUps(NOW);
    expect((inserted.notifications as { entity_id: string }[]).map((x) => x.entity_id)).toEqual(["l2"]);
  });
});

describe("share helpers", () => {
  it("formats phone numbers", () => {
    expect(formatPhone("9876543210")).toBe("+91 98765 43210");
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(formatPhone("012345")).toBe("012345");
  });
  it("builds the WhatsApp caption", () => {
    expect(lostShareText({ headline: "LOST: Bruno, Labrador, last seen Dwarka", area: "Dwarka Sec 10", reward: "Reward ₹5000" })).toBe(
      "LOST: Bruno, Labrador, last seen Dwarka\n📍 Dwarka Sec 10\n🎁 Reward ₹5000\nPlease share in your society groups 🐾",
    );
    expect(lostShareText({ headline: "REUNITED: Bruno", area: "x", reunited: true })).toMatch(/Thank you/);
  });
  it("names the poster file", () => {
    expect(posterFilename({ type: "lost", pet_name: "Bruno Jr.", species: "dog" })).toBe("pupmeow-lost-bruno-jr.png");
    expect(posterFilename({ type: "found", pet_name: null, species: "cat" })).toBe("pupmeow-found-cat.png");
  });
});
