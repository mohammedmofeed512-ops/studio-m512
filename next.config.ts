import type { NextConfig } from "next";

// Every page in Studio M512 is private and per-user, so pages render dynamically
// on each request. Cache Components stays off to keep that model simple.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
