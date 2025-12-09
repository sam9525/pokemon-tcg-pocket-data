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
    loader: "custom",
    loaderFile: "./src/lib/cloudflareLoader.ts",
    deviceSizes: [],
    imageSizes: [180, 360],
    formats: ["image/webp"],
  },
  output: "standalone",
  webpack: (config, {}) => {
    // Enable polling for file watching in Docker
    if (process.env.CHOKIDAR_USEPOLLING === "true") {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    return config;
  },
};

export default nextConfig;
