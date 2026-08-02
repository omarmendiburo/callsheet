import Link from "next/link";

/*
 * 404 in the house style (audit 2026-08-02). Plain, honest, one way home.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="fact-secondary">callsheet · 404</p>
      <h1 className="headline mt-4 text-5xl">Not on the callsheet.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        This page does not exist, or it moved. If a link brought you here,
        the thing it pointed at may have been removed.
      </p>
      <p className="mt-8">
        <Link className="fact underline underline-offset-4" href="/">
          back to the front page
        </Link>
      </p>
    </main>
  );
}
