"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  CircleUser,
  Clapperboard,
  FolderPlus,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/*
 * The system shell: a fixed white sidebar with the clapper mark, quiet caps
 * labels, hairline right rule. Active item inverts to black — same language
 * as an active chip. Icons are lucide (the one approved set), 16px, 1.5
 * stroke, matching the hairline weight. On small screens the sidebar becomes
 * a top bar with the same links scrolling horizontally.
 *
 * Icon names resolve here (component references cannot cross the
 * server->client boundary).
 */

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  work: Briefcase,
  profile: CircleUser,
  onboarding: ListChecks,
  "screen-tests": Clapperboard,
  scout: Search,
  team: Users,
  "new-project": FolderPlus,
  overview: Gauge,
  users: Users,
  moderation: ShieldCheck,
  certification: BadgeCheck,
  metrics: BarChart3,
};

export type ShellLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS | string;
};

export function AppShell({
  section,
  links,
  userName,
  userRole,
  children,
}: {
  section: string;
  links: ShellLink[];
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (path === "/talent" || path === "/business" || path === "/admin") {
      return pathname === path;
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const item = (l: ShellLink, compact: boolean) => {
    const Icon = ICONS[l.icon] ?? LayoutDashboard;
    const active = isActive(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        className={`flex items-center gap-3 transition-opacity duration-150 ${
          compact ? "px-3 py-2" : "px-4 py-2.5"
        } ${
          active
            ? "bg-accent text-paper"
            : "text-secondary hover:opacity-70"
        }`}
      >
        <Icon size={16} strokeWidth={1.5} className="shrink-0" />
        <span className="fact">{l.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      {/* Small screens: top bar. */}
      <div className="border-b border-rule sm:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Callsheet" width={22} height={24} />
            <span className="headline text-xl leading-none">Callsheet</span>
          </Link>
          <span className="fact-secondary">{section}</span>
        </div>
        <nav className="flex overflow-x-auto border-t border-rule">
          {links.map((l) => item(l, true))}
        </nav>
      </div>

      {/* The sidebar. */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-rule sm:flex">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-5 transition-opacity duration-150 hover:opacity-70"
        >
          <Image src="/logo.png" alt="Callsheet" width={26} height={28} />
          <span className="headline text-xl leading-none">Callsheet</span>
        </Link>
        <p className="fact-secondary border-t border-rule px-4 pt-4 pb-2">
          {section}
        </p>
        <nav className="flex flex-col">{links.map((l) => item(l, false))}</nav>
        <div className="mt-auto border-t border-rule px-4 py-4">
          <p className="truncate text-[13px]">{userName}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="fact-secondary">{userRole}</span>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="fact-secondary underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
              >
                log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-6 sm:px-10 sm:py-8">
        {children}
      </main>
    </div>
  );
}
