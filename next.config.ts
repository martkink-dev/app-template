import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The docs open the app at http://127.0.0.1:3000 (the same host as
  // site_url in supabase/config.toml). Next.js treats it as a different
  // origin from localhost and blocks its dev resources unless allowed here.
  // Development only; has no effect on production builds.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
