/*
 * Chrome moved to app/admin/layout.tsx (the system sidebar). This wrapper
 * stays so pages keep working; it now only bounds content width. The
 * `active` prop is vestigial — the sidebar reads the pathname itself.
 */

export function AdminShell({
  children,
}: {
  active?: string;
  children: React.ReactNode;
}) {
  return <div className="mx-auto w-full max-w-5xl">{children}</div>;
}
