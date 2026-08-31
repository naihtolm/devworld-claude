/** @type {import('next').NextConfig} */
const nextConfig = {
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
