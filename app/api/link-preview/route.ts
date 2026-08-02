import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/*
 * Link unfurler: fetches a submitted work link server-side and redirects to
 * the page's own preview image (og:image / twitter:image), so pasted links
 * we cannot embed (Google Photos, Drive, portfolio sites) still show a real
 * frame instead of a bare "open work at" label (owner's ask 2026-08-02).
 *
 * This endpoint fetches user-supplied URLs, so it is deliberately paranoid:
 * logged-in users only, https only, private/internal hosts refused (including
 * IP literals), 5s timeout, HTML reads capped at 2MB, and the response is
 * only ever a redirect to the discovered image or a 204. Results cache at
 * the edge for a day.
 */

const MAX_HTML = 2 * 1024 * 1024; // Google Photos parks its og tags past 1MB

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  // IPv6 literal or anything bracketed.
  if (h.includes(":") || h.startsWith("[")) return true;
  // IPv4 literals: allow none (public sites have names).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  return false;
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 204 });

  const target = new URL(request.url).searchParams.get("u") ?? "";
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (u.protocol !== "https:" || isBlockedHost(u.hostname)) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const res = await fetch(u.toString(), {
      headers: {
        // Some hosts only emit og tags for crawler-ish agents.
        "User-Agent": "Mozilla/5.0 (compatible; CallsheetPreview/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
      next: { revalidate: 86400 },
    });
    if (!res.ok) return new NextResponse(null, { status: 204 });
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html"))
      return new NextResponse(null, { status: 204 });

    const html = (await res.text()).slice(0, MAX_HTML);
    const m =
      html.match(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["']/i,
      );
    const img = m?.[1];
    if (!img) return new NextResponse(null, { status: 204 });

    let imgUrl: URL;
    try {
      imgUrl = new URL(img, u);
    } catch {
      return new NextResponse(null, { status: 204 });
    }
    if (imgUrl.protocol !== "https:" || isBlockedHost(imgUrl.hostname)) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.redirect(imgUrl.toString(), {
      status: 302,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
