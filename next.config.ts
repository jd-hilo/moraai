import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  // Allow large ChatGPT/Claude export files (can be 100MB+).
  // proxyClientMaxBodySize controls the body buffer for App Router route handlers
  // when proxy/middleware is present. serverActions.bodySizeLimit covers Server Actions.
  experimental: {
    proxyClientMaxBodySize: "500mb",
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
