import type { NextConfig } from "next";

const rawBackend = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:8000";
let backendUrl = rawBackend.trim();
if (!backendUrl.startsWith("http://") && !backendUrl.startsWith("https://")) {
  backendUrl = `https://${backendUrl}`;
}
backendUrl = backendUrl.replace(/\/$/, "");
try {
  const parsed = new URL(backendUrl);
  if (!parsed.hostname.includes(".") && !parsed.hostname.includes("localhost")) {
    parsed.hostname = `${parsed.hostname}.onrender.com`;
    backendUrl = parsed.origin;
  }
} catch {
  // fallback to raw
}

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
