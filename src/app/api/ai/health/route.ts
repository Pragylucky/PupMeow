import { NextResponse, type NextRequest } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { aiGuard, sameOrigin } from "@/lib/ai/guard";
import { getLanguageModel } from "@/lib/ai/provider";
import { petContextFor } from "@/lib/ai/prompts";
import { vaccineSuggestionSchema } from "@/lib/validations/ai";
import { VACCINATION_SCHEDULES } from "@/lib/constants";
import type { HealthRecordRow, PetRow } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Health record helper: suggests upcoming vaccinations from age + history (with vet disclaimer in UI). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = z.object({ petId: z.uuid() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid pet" }, { status: 400 });
  const g = await aiGuard("health", req);
  if ("error" in g) return g.error;
  const { data: pet } = await g.supabase.from("pets").select("*").eq("id", body.data.petId).eq("owner_id", g.userId).maybeSingle();
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  const { data: recs } = await g.supabase.from("pet_health_records").select("*").eq("pet_id", body.data.petId).order("date", { ascending: false }).limit(30);
  const p = pet as PetRow;
  const schedule = VACCINATION_SCHEDULES[p.species].map((s) => `- ${s.name}: first at ${s.ageWeeks} weeks${s.repeatMonths ? `, then every ${s.repeatMonths} months` : ""} (${s.note})`).join("\n");
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { output } = await generateText({
      model: getLanguageModel(),
      output: Output.object({ schema: vaccineSuggestionSchema }),
      system: "You help Indian pet owners plan vaccinations and preventive care. Use the reference schedule and the pet's records. Suggest only items that look due or upcoming in the next 6 months and are not already recorded as done recently. If the birthday is unknown, assume an adult and suggest annual boosters. Dates must be YYYY-MM-DD and not before today. Keep reasons short. Never give medicine doses.",
      prompt: `Today: ${today}\nReference schedule for ${p.species}s in India:\n${schedule}\n\nPet:\n${petContextFor(p, (recs ?? []) as HealthRecordRow[])}`,
      abortSignal: AbortSignal.timeout(20000),
    });
    const suggestions = output.suggestions.map((s) => ({ ...s, due_date: s.due_date < today ? today : s.due_date }));
    return NextResponse.json({ suggestions, remaining: g.remaining });
  } catch (err) {
    console.error("[ai/health]", err);
    return NextResponse.json({ error: "Couldn't get suggestions right now." }, { status: 502 });
  }
}
