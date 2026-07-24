import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome pour un conteneur Docker léger.
  output: "standalone",
};

export default nextConfig;
