import Link from "next/link";
import type { Params } from "./filters";
import { toggleHref } from "./filters";

/*
 * A chip rendered as a navigation link (server component). Chips are the only
 * discovery mechanism on every marketplace surface — no search inputs. Active
 * inverts to white-on-black; inactive is grey-on-white. Same visual contract
 * as components/ui.tsx Chip, but a link instead of a button so filters are
 * plain GET navigation with no client JS.
 */
export function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`fact inline-block border px-2 py-1.5 transition-opacity duration-150 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-paper text-secondary hover:opacity-80"
      }`}
    >
      {children}
    </Link>
  );
}

export type ChipOption = { value: string; label: string };

/*
 * One labeled filter row: a mono label, then a wrapped row of chips. Each chip
 * toggles `paramKey` in the URL against the current params. When multi is
 * false (default) a single value is set/cleared; the caller owns any
 * "clear all" affordance via the label link.
 */
export function FilterRow({
  label,
  base,
  params,
  paramKey,
  options,
  activeValue,
}: {
  label: string;
  base: string;
  params: Params;
  paramKey: string;
  options: ChipOption[];
  activeValue?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="fact-secondary shrink-0 pt-1.5 sm:w-28">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = activeValue === o.value;
          return (
            <ChipLink
              key={o.value}
              href={toggleHref(base, params, paramKey, o.value, active)}
              active={active}
            >
              {o.label}
            </ChipLink>
          );
        })}
      </div>
    </div>
  );
}
