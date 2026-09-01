/** @type {import('next').NextConfig} */
const nextConfig = {
  // The `postgres` driver relies on raw net/tls socket behavior that breaks
  // when webpack bundles it into the server build (connections silently
  // hang instead of erroring) — keep it as a native require() instead.
  serverExternalPackages: ["postgres"],
  images: {
    remotePatterns: [
      // GitHub avatars / repo social previews, portfolio image hosts, etc.
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Clerk user profile photos.
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
