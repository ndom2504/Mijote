import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: path.join(process.cwd()),
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
