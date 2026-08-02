import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

/*
 * Front-of-house nav. Logo is the home button; sign up is the one
 * emphasized action. Auth-aware: logged-in users get their dashboard
 * link instead of log in / sign up.
 *
 * `primary` (default true) controls whether sign-up renders filled. Pages
 * that carry their own PrimaryButton (login, forgot, reset) pass false so
 * only one black primary exists per screen (DESIGN law; audit 2026-08-02).
 */
export async function Nav({ primary = true }: { primary?: boolean } = {}) {
  const user = await getCurrentUser();
  return (
    <nav className="mx-auto flex w-full max-w-350 items-center justify-between gap-6 px-6 py-5 sm:px-10">
      <Link
        href="/"
        className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-70"
      >
        <Image
          src="/logo.png"
          alt="Callsheet"
          width={30}
          height={32}
          priority
        />
        <span className="headline text-2xl leading-none">Callsheet</span>
      </Link>
      <div className="flex items-center gap-5 sm:gap-7">
        <Link
          className="fact-secondary transition-opacity duration-150 hover:opacity-70"
          href="/about"
        >
          about
        </Link>
        <a
          className="fact-secondary hidden transition-opacity duration-150 hover:opacity-70 sm:inline"
          href="https://www.hmntystudios.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          hmnty studios
        </a>
        {user ? (
          <Link
            className="fact border border-ink px-3 py-2 transition-opacity duration-150 hover:opacity-70"
            href={`/${user.role}`}
          >
            dashboard
          </Link>
        ) : (
          <>
            <Link
              className="fact-secondary transition-opacity duration-150 hover:opacity-70"
              href="/login"
            >
              log in
            </Link>
            <Link
              className={
                primary
                  ? "fact bg-ink px-3 py-2 text-paper transition-opacity duration-150 hover:opacity-80"
                  : "fact border border-ink px-3 py-2 transition-opacity duration-150 hover:opacity-70"
              }
              href="/signup"
            >
              sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
