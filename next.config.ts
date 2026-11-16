import type { NextConfig } from "next";

// Static export: COOP/COEP headers cannot live here (export ignores `headers()`),
// so they are owned by `public/_headers` and applied by the host.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
