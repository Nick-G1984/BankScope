/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow rss-parser and cheerio to run in server-side code
  // without Next.js attempting to bundle them for the browser
  experimental: {
    serverComponentsExternalPackages: ['rss-parser', 'cheerio'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.fca.org.uk' },
      { protocol: 'https', hostname: 'www.bankofengland.co.uk' },
    ],
  },
}

export default nextConfig
