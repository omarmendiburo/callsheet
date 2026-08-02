"use client";

/*
 * Global error boundary (audit 2026-08-02): an uncaught server error used to
 * fall through to Next's default screen, off-vocabulary and unexplained.
 * Same tokens as everything else; one primary action (try again).
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="fact-secondary">callsheet · error</p>
      <h1 className="headline mt-4 text-5xl">Something broke.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        Not you, us. The page hit an error it could not recover from. Try
        again; if it keeps happening, tell the HMNTY team what you were doing.
      </p>
      <div className="mt-8">
        <button
          type="button"
          onClick={reset}
          className="fact bg-ink px-5 py-4 text-paper transition-opacity duration-150 hover:opacity-80"
        >
          TRY AGAIN
        </button>
      </div>
    </main>
  );
}
