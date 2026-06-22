/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  transpilePackages: ["three"],
  async redirects() {
    return [
      // Blog moved from a Studio subtab to its own top-level section.
      { source: "/studio/blog/:slug", destination: "/blog/:slug", permanent: true },
    ]
  },
};

export default nextConfig;
