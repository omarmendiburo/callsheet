/*
 * Link-media classification. No storage service tonight: creatives paste a
 * URL (YouTube / Vimeo / Instagram / anywhere) and frame surfaces render a
 * real embed or thumbnail whenever the row's url is real http(s). Seed and
 * link-less rows use the "placeholder:" scheme and keep rendering as
 * letterboxes. Pure functions, safe on server and client.
 */

export type MediaSource =
  | { kind: "placeholder" }
  | { kind: "youtube"; id: string; embedUrl: string; thumbUrl: string }
  | { kind: "vimeo"; id: string; embedUrl: string }
  | { kind: "instagram"; embedUrl: string; pageUrl: string }
  | { kind: "video"; url: string }
  | { kind: "link"; url: string; host: string };

export function isRealMediaUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && /^https?:\/\/\S+$/i.test(url);
}

/* Strip the noise subdomains so youtube.com === www.youtube.com === m.youtube.com. */
function hostOf(u: URL): string {
  return u.hostname.toLowerCase().replace(/^(www|m)\./, "");
}

const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;

function youtubeId(u: URL, host: string): string | null {
  if (host === "youtu.be") {
    const id = u.pathname.split("/")[1] ?? "";
    return YT_ID.test(id) ? id : null;
  }
  const v = u.searchParams.get("v");
  if (v && YT_ID.test(v)) return v;
  const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,20})/);
  return m ? m[1] : null;
}

export function classifyMediaUrl(url: string | null | undefined): MediaSource {
  if (!isRealMediaUrl(url)) return { kind: "placeholder" };
  let u: URL;
  try {
    u = new URL(url as string);
  } catch {
    return { kind: "placeholder" };
  }
  const host = hostOf(u);

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const id = youtubeId(u, host);
    if (id) {
      return {
        kind: "youtube",
        id,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/\/(\d{6,12})(?:$|\/)/);
    if (m) {
      return {
        kind: "vimeo",
        id: m[1],
        embedUrl: `https://player.vimeo.com/video/${m[1]}`,
      };
    }
  }

  // Uploaded (or directly linked) video files play in a native player.
  if (
    /\.blob\.vercel-storage\.com$/.test(host) ||
    /\.(mp4|mov|webm|m4v)$/i.test(u.pathname)
  ) {
    return { kind: "video", url: url as string };
  }

  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (m) {
      const pageUrl = `https://www.instagram.com/${m[1]}/${m[2]}/`;
      return { kind: "instagram", embedUrl: `${pageUrl}embed/`, pageUrl };
    }
  }

  return { kind: "link", url: url as string, host };
}

/* Shorts and reels are vertical by nature; used to default the 9:16 flag
 * when a creative registers a piece by link. */
export function looksVertical(url: string | null | undefined): boolean {
  if (!isRealMediaUrl(url)) return false;
  return /youtube\.com\/shorts\/|instagram\.com\/(reels?|tv)\//i.test(url as string);
}
