// next.config.js (or next.config.mjs / ts)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cryptologos.cc",
        pathname: "/logos/**",
      },
      {
        protocol: "https",
        hostname: "cdn.moralis.io",
        pathname: "/**", // or restrict to "/eth/**" if appropriate
      },
      {
        protocol: "https",
        hostname: "logo.moralis.io",
        pathname: "/**", // or restrict to "/eth/**" if appropriate
      },
    ],
  },
};

export default nextConfig;
