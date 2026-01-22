import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  transpilePackages: [
    "@dnd-kit/core",
    "@dnd-kit/sortable",
    "@dnd-kit/utilities",
    "@clerk/nextjs",
    "@clerk/themes",
  ],


  typescript: {
    ignoreBuildErrors: true,
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: [
        { loader: "raw-loader" },
        { loader: "glslify-loader" },
      ],
    });

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@data": path.resolve(__dirname, "data"),
    };

    return config;
  },
};

export default nextConfig;
