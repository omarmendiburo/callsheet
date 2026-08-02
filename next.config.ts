import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships its own WASM runtime — bundling it breaks path resolution
  // and takes down every DB-touching server action. Keep it external.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The marketing site is four static pages under public/ (owner's call
  // 2026-08-02). beforeFiles so "/" wins over app/page.tsx; every other route
  // stays with the app router. Keep these in step with the nav in the four
  // .html files — there is no build step generating either side.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/home.html" },
        { source: "/who-its-for", destination: "/who-its-for.html" },
        { source: "/how-it-works", destination: "/how-it-works.html" },
        { source: "/proof-it-works", destination: "/proof-it-works.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
