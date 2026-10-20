import { NextResponse } from "next/server";
import { getAiConfigStatus } from "@/lib/ai/config";

export const runtime = "nodejs";

/** Public health check: is Kaia configured on this deployment? (no secrets returned) */
export async function GET() {
  const status = getAiConfigStatus();
  return NextResponse.json(status, {
    status: status.assistant ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
