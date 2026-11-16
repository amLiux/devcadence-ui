import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
