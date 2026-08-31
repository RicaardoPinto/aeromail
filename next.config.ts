import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer"],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
