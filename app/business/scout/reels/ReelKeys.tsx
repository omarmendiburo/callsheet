"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
 * Keyboard navigation for the reel view: left arrow -> previous, right arrow
 * -> next. Both wrap around (the server already computed the wrapped hrefs).
 * Dependency-free; a single effect that pushes the pre-built prev/next hrefs.
 * We ignore key events while a form field is focused so the filter chips and
 * any inputs keep behaving normally.
 */
export function ReelKeys({
  prevHref,
  nextHref,
}: {
  prevHref: string;
  nextHref: string;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        router.push(nextHref);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        router.push(prevHref);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref]);

  return null;
}
