import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["busboy", "socket.io", "socket.io-client", "jsdom", "pg", "jose"],
};

export default nextConfig;
