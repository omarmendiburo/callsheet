import Link from "next/link";

/*
 * Shared admin chrome: the "Callsheet / admin" header, a mono section nav, and
 * a log-out control. Internal tool — plain and fast, one width, no decoration.
 */

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "overview" },
  { href: "/admin/users", label: "users" },
  { href: "/admin/moderation", label: "moderation" },
  { href: "/admin/certification", label: "certification" },
  { href: "/admin/metrics", label: "metrics" },
];

export function AdminShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/admin">Callsheet · admin</Link>
        </p>
        <form action="/logout" method="post">
          <button className="fact-secondary" type="submit">
            log out
          </button>
        </form>
      </header>

      <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-b border-rule py-3">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={
              n.href === active
                ? "fact underline underline-offset-4"
                : "fact-secondary underline underline-offset-4"
            }
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}
