import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const TURBOPACK_ROOT = "C:/Users/ASUS/.openclaw/workspace/aloure/frontend";

const nextConfig: NextConfig = {
  output: "export",
  turbopack: {
    root: TURBOPACK_ROOT,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_BASE}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
