import Link from "next/link";
import { MediaFrame } from "@/components/media";
import type { BrowseCreative } from "./_data";

/*
 * A wall card (DESIGN.md "Card"): the creative's work in its native aspect
 * ratio on a frame, with two lines of mono metadata beneath — disciplines on
 * the left, CITY · AVAILABILITY · $RATE on the right. NO name, NO headshot,
 * NO school. The whole card is one click target to the reveal. Hover reduces
 * opacity only; no lift, scale, or shadow.
 *
 * `mediaIndex` picks which of the creative's approved media rides the card;
 * the screen-tests feed passes the pitch, the scout grid passes the reel.
 */

const AVAIL_SHORT: Record<string, string> = {
  now: "available now",
  from_date: "avail. soon",
  unavailable: "unavailable",
};

function disciplineLine(c: BrowseCreative): string {
  const names = c.disciplines.map((d) => d.type);
  if (names.length === 0) return "creative";
  if (names.length <= 2) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} +${names.length - 2}`;
}

function factLine(c: BrowseCreative): string {
  const parts = [c.city, AVAIL_SHORT[c.availability] ?? c.availability];
  if (c.dayRate != null) parts.push(`$${c.dayRate}`);
  return parts.join(" · ");
}

export function WorkCard({
  creative,
  media,
  orgId,
}: {
  creative: BrowseCreative;
  media: BrowseCreative["media"][number];
  /* Threads ?org= into the reveal link so multi-org users keep their org
   * context on the wall's main click path (audit 2026-08-02). */
  orgId?: string;
}) {
  return (
    <Link
      href={
        orgId
          ? `/business/scout/${creative.talentId}?org=${encodeURIComponent(orgId)}`
          : `/business/scout/${creative.talentId}`
      }
      className="block break-inside-avoid transition-opacity duration-150 hover:opacity-90"
    >
      {/* Non-interactive on the wall: the whole card is the click, and it
          goes to the reveal. Real links still show as real thumbnails. */}
      <MediaFrame url={media.url} vertical={media.vertical} label={media.kind} />
      <div className="mt-2 flex items-start justify-between gap-3">
        <span className="fact">{disciplineLine(creative)}</span>
        <span className="fact-secondary text-right">{factLine(creative)}</span>
      </div>
    </Link>
  );
}
