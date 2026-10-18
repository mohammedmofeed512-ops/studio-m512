import type { NextConfig } from "next";

// Every page in Studio M512 is private and per-user, so pages render dynamically
// on each request. Cache Components stays off to keep that model simple.
const nextConfig: NextConfig = {
  // Whole scripts are saved through Server Actions; a feature film is a few hundred KB of JSON.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
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
