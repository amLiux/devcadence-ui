import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
  async redirects() {
    return [{ source: "/", destination: "/workflows", permanent: false }];
  },
  images: {
    remotePatterns: [
      // GitHub avatars returned by the API (contributors, assignees).
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
