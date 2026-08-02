import { getCurrentUser } from "@/lib/auth";
import { listUserOrgs } from "@/lib/tenancy";
import { AppShell, type ShellLink } from "@/components/app-shell";

/* Business portal chrome. Public /business/signup and logged-out visitors
 * render bare — page gates handle redirects. Org-scoped links appear when
 * the user belongs to exactly one org (the common case); multi-org users
 * navigate through the org switcher on the overview. */
export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "business") return <>{children}</>;

  const orgs = await listUserOrgs(user.id);
  const links: ShellLink[] = [
    { href: "/business", label: "overview", icon: "dashboard" },
    { href: "/business/scout", label: "scout talent", icon: "scout" },
  ];
  if (orgs.length === 1) {
    const orgId = orgs[0].org.id;
    links.push(
      { href: `/business/${orgId}/team`, label: "team", icon: "team" },
      {
        href: `/business/${orgId}/projects/new`,
        label: "new project",
        icon: "new-project",
      },
    );
  }

  return (
    <AppShell
      section="business"
      userName={user.name}
      userRole={orgs[0]?.role ?? "member"}
      links={links}
    >
      {children}
    </AppShell>
  );
}
