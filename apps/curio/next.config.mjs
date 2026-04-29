/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tollgate/agent', '@tollgate/shared'],
  serverExternalPackages: ['@solana/web3.js', '@solana/spl-token'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
