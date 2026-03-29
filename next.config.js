/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Note: api.bodyParser only works for Pages Router.
  // For App Router API routes, body size is handled per-route via route segment config.
}
module.exports = nextConfig
