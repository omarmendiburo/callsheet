import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships its own WASM runtime — bundling it breaks path resolution
  // and takes down every DB-touching server action. Keep it external.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The homepage is the founders' static landing (public/home.html, owner's
  // call 2026-08-02). beforeFiles so it wins over app/page.tsx; every other
  // route stays with the app router.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/home.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
