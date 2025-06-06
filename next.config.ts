import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
