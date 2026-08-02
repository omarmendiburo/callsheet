import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/* Talent portal chrome. Unauthenticated or wrong-role visitors render bare —
 * each page's own requireUser gate handles the redirect. */
export default async function TalentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "talent") return <>{children}</>;

  return (
    <AppShell
      section="talent"
      userName={user.name}
      userRole="creative"
      links={[
        { href: "/talent", label: "dashboard", icon: "dashboard" },
        { href: "/talent/jobs", label: "open work", icon: "work" },
        { href: "/talent/profile", label: "my profile", icon: "profile" },
        { href: "/talent/onboarding", label: "onboarding", icon: "onboarding" },
      ]}
    >
      {children}
    </AppShell>
  );
}
