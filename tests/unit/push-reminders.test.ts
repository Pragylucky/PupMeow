import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny stand-in for the Supabase admin client: every query resolves to the rows set for its table.
const tables: Record<string, unknown[]> = {};
const inserted: Record<string, unknown[]> = {};
const deleted: Record<string, unknown[]> = {};
function query(table: string) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "lte", "order", "limit"]) q[m] = () => q;
  q.in = (_col: string, vals: unknown[]) => {
    if (q.__deleting) (deleted[table] ??= []).push(...vals);
    return q;
  };
  q.delete = () => ((q.__deleting = true), q);
  q.insert = async (rows: unknown[]) => ((inserted[table] ??= []).push(...rows), { error: null });
  q.then = (resolve: (v: unknown) => void) => resolve({ data: tables[table] ?? [], error: null });
  return q;
}
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: query }), hasServiceRole: () => true }));

const sendNotification = vi.fn();
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => sendNotification(...a) } }));

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BPublicKeyForTests";
process.env.VAPID_PRIVATE_KEY = "privateKeyForTests";

const { reminderMessage, sendDueReminders } = await import("@/lib/reminders");
const { sendPushToUsers } = await import("@/lib/push");

// 2 Nov 2026, 09:00 India time.
const NOW = new Date("2026-11-02T03:30:00Z");

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(inserted)) delete inserted[k];
  for (const k of Object.keys(deleted)) delete deleted[k];
  sendNotification.mockReset().mockResolvedValue({});
});

describe("reminderMessage", () => {
  it("words each reminder", () => {
    expect(reminderMessage("Bruno", "Anti-Rabies", 3)).toBe("Bruno's Anti-Rabies is due in 3 days. Book the vet visit now.");
    expect(reminderMessage("Bruno", "Anti-Rabies", 1)).toBe("Bruno's Anti-Rabies is due in 1 day. Book the vet visit now.");
    expect(reminderMessage("Mithu", "Deworming", 0)).toBe("Mithu's Deworming is due today.");
    expect(reminderMessage("Mithu", "Deworming", -7)).toBe("Mithu's Deworming was due 7 days ago. Book a vet visit soon.");
  });
});

describe("sendDueReminders", () => {
  beforeEach(() => {
    tables.pet_health_records = [
      { pet_id: "p1", owner_id: "u1", title: "Anti-Rabies", next_due_date: "2026-11-05" },
      { pet_id: "p1", owner_id: "u1", title: "Deworming", next_due_date: "2026-11-02" },
      { pet_id: "p2", owner_id: "u2", title: "FVRCP", next_due_date: "2026-10-26" },
      { pet_id: "p3", owner_id: "u3", title: "Tick treatment", next_due_date: "2026-11-02" },
      { pet_id: "p4", owner_id: "u4", title: "Rabies", next_due_date: "2026-11-02" },
    ];
    tables.profile_private = [{ id: "u1" }, { id: "u2" }, { id: "u4" }]; // u3 turned reminders off
    tables.profiles = [{ id: "u4" }]; // u4 is banned
    tables.pets = [{ id: "p1", name: "Bruno" }, { id: "p2", name: "Mithu" }];
    tables.push_subscriptions = [
      { user_id: "u1", endpoint: "https://push.example/u1", p256dh: "k".repeat(20), auth: "a".repeat(8) },
      { user_id: "u2", endpoint: "https://push.example/u2", p256dh: "k".repeat(20), auth: "a".repeat(8) },
    ];
  });

  it("reminds only people who want it, and isn't banned", async () => {
    const r = await sendDueReminders(NOW);
    const rows = inserted.notifications as { user_id: string; message: string; entity_type: string; type: string }[];
    expect(rows.map((x) => x.user_id).sort()).toEqual(["u1", "u1", "u2"]);
    expect(rows.every((x) => x.type === "reminder" && x.entity_type === "pet")).toBe(true);
    expect(rows.map((x) => x.message)).toContain("Mithu's FVRCP was due 7 days ago. Book a vet visit soon.");
    expect(r).toEqual({ notified: 3, pushed: 2 });
  });

  it("sends one push per person, summarising several items", async () => {
    await sendDueReminders(NOW);
    const bodies = sendNotification.mock.calls.map((c) => JSON.parse(c[1] as string));
    const bruno = bodies.find((b) => b.body.startsWith("Bruno"));
    expect(bruno).toMatchObject({ title: "💉 Pet health reminders", url: "/notifications" });
    expect(bruno.body).toMatch(/\(\+1 more\)$/);
    expect(bodies.find((b) => b.body.startsWith("Mithu"))).toMatchObject({ title: "💉 Pet health reminder", url: "/pets/p2/health" });
  });

  it("doesn't repeat a reminder already sent today (cron retry)", async () => {
    tables.notifications = [{ user_id: "u2", message: "Mithu's FVRCP was due 7 days ago. Book a vet visit soon." }];
    const r = await sendDueReminders(NOW);
    expect((inserted.notifications as { user_id: string }[]).some((x) => x.user_id === "u2")).toBe(false);
    expect(r.notified).toBe(2);
  });
});

describe("sendPushToUsers", () => {
  it("removes subscriptions the push service says are gone", async () => {
    tables.push_subscriptions = [
      { user_id: "u1", endpoint: "https://push.example/alive", p256dh: "k".repeat(20), auth: "a".repeat(8) },
      { user_id: "u1", endpoint: "https://push.example/gone", p256dh: "k".repeat(20), auth: "a".repeat(8) },
    ];
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("gone")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      return {};
    });
    const sent = await sendPushToUsers(new Map([["u1", { title: "t", body: "b", url: "/" }]]));
    expect(sent).toBe(1);
    expect(deleted.push_subscriptions).toEqual(["https://push.example/gone"]);
  });
});
