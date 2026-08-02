import { NextResponse } from "next/server";
import { activeEngine, claudeKeyPresent } from "@/lib/ai/types";

/*
 * AI engine health check (spec §8). Lets surfaces label honestly which engine
 * is live: heuristic tonight, Claude the moment ANTHROPIC_API_KEY lands.
 * GET -> { engine: "claude" | "heuristic", keyPresent: boolean }
 */
export async function GET() {
  return NextResponse.json({
    engine: activeEngine(),
    keyPresent: claudeKeyPresent(),
  });
}
