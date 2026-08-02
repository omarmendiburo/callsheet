"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { classifyMediaUrl } from "@/lib/media";

/*
 * MediaFrame: the one media surface. Letterbox (WorkFrame look) for
 * placeholder rows; a real embed or thumbnail when the row's url is a real
 * link. `interactive` decides whether a player may load in place:
 *
 *   - browsing walls (scout grid, screen-tests) sit inside a Link and stay
 *     NON-interactive: YouTube shows its thumbnail image, other providers
 *     show a labelled letterbox. The click is the card's, and goes to the
 *     reveal. No name is ever introduced by the frame itself.
 *   - reveal / reels / profile / onboarding / moderation pass `interactive`:
 *     YouTube is click-to-play (thumbnail first, then the player), Vimeo and
 *     Instagram load their embed directly, plain links get an "open work"
 *     anchor on the frame.
 *
 * Frame colour stays behind every embed; 0 radius; opacity motion only.
 */

const IFRAME_ALLOW =
  "autoplay; fullscreen; encrypted-media; picture-in-picture";

export function MediaFrame({
  url,
  vertical,
  label,
  interactive = false,
}: {
  url?: string | null;
  vertical?: boolean;
  label: string;
  interactive?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const source = classifyMediaUrl(url);
  const frame = `relative flex w-full items-center justify-center overflow-hidden bg-frame ${
    vertical ? "aspect-9/16" : "aspect-video"
  }`;

  if (source.kind === "placeholder") {
    return (
      <div className={frame}>
        <span className="fact text-paper opacity-60">{label}</span>
      </div>
    );
  }

  if (source.kind === "youtube") {
    if (interactive && playing) {
      return (
        <div className={frame}>
          <iframe
            src={`${source.embedUrl}?autoplay=1`}
            title={label}
            allow={IFRAME_ALLOW}
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      );
    }
    const thumb = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source.thumbUrl}
        alt={label}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
    if (!interactive) {
      return <div className={frame}>{thumb}</div>;
    }
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`play ${label}`}
        className={`${frame} cursor-pointer transition-opacity duration-150 hover:opacity-90`}
      >
        {thumb}
        <span className="relative flex h-12 w-12 items-center justify-center bg-ink">
          <Play
            className="h-5 w-5 text-paper"
            fill="currentColor"
            strokeWidth={1}
            aria-hidden
          />
        </span>
      </button>
    );
  }

  if (source.kind === "video") {
    if (interactive) {
      return (
        <div className={frame}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={source.url}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      );
    }
    return (
      <div className={frame}>
        <span className="fact text-paper opacity-60">{label}</span>
      </div>
    );
  }

  if (source.kind === "vimeo" || source.kind === "instagram") {
    if (interactive) {
      return (
        <div className={frame}>
          <iframe
            src={source.embedUrl}
            title={label}
            allow={IFRAME_ALLOW}
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0 bg-paper"
          />
        </div>
      );
    }
    return (
      <div className={frame}>
        <span className="fact text-paper opacity-60">
          {source.kind} · {label}
        </span>
      </div>
    );
  }

  // Plain link: the work lives somewhere we cannot inline. Interactive
  // surfaces get a real anchor out; walls just name the host.
  if (interactive) {
    return (
      <div className={frame}>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="fact text-paper underline underline-offset-4 opacity-80 transition-opacity duration-150 hover:opacity-100"
        >
          open work at {source.host}
        </a>
      </div>
    );
  }
  return (
    <div className={frame}>
      <span className="fact text-paper opacity-60">
        {source.host} · {label}
      </span>
    </div>
  );
}
