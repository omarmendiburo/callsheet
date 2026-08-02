import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/* Staff back office chrome. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return <>{children}</>;

  return (
    <AppShell
      section="back office"
      userName={user.name}
      userRole="hmnty staff"
      links={[
        { href: "/admin", label: "overview", icon: "overview" },
        { href: "/admin/users", label: "accounts", icon: "users" },
        { href: "/admin/moderation", label: "moderation", icon: "moderation" },
        {
          href: "/admin/certification",
          label: "certification",
          icon: "certification",
        },
        { href: "/admin/metrics", label: "metrics", icon: "metrics" },
      ]}
    >
      {children}
    </AppShell>
  );
}
