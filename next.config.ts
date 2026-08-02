import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships its own WASM runtime — bundling it breaks path resolution
  // and takes down every DB-touching server action. Keep it external.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
