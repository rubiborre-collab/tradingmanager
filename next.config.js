/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { 
    unoptimized: true 
  },
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'out',
  basePath: '',
  assetPrefix: '',
  optimizeFonts: false,
};

module.exports = nextConfig;