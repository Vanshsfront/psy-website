/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Every uploaded image now lives on the self-hosted storage API. Without
        // this next/image refuses to load them and the page renders alt text,
        // which is what happened the moment storage moved off Supabase.
        protocol: "https",
        hostname: "psydb.goatedd.tech",
      },
      {
        // Kept so anything still holding an old Supabase URL — a draft, a cached
        // page, an un-rewritten row — keeps rendering instead of breaking.
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
