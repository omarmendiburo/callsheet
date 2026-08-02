import { NextResponse } from "next/server";
import { activeEngine, claudeKeyPresent } from "@/lib/ai/types";
import { claudeUsageToday } from "@/lib/ai/claude";

/*
 * AI engine health check (spec §8). Lets surfaces label honestly which engine
 * is live: heuristic tonight, Claude the moment ANTHROPIC_API_KEY lands.
 * callsToday/dailyCap expose the code-level spend backstop (per server
 * instance; see lib/ai/claude.ts).
 * GET -> { engine, keyPresent, callsToday, dailyCap }
 */
export async function GET() {
  const usage = claudeUsageToday();
  return NextResponse.json({
    engine: activeEngine(),
    keyPresent: claudeKeyPresent(),
    callsToday: usage.calls,
    dailyCap: usage.cap,
  });
}
