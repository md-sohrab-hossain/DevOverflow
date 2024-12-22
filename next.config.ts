import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty'],
  images: {
    remotePatterns: [
      {
        protocol: 'https', // specify the protocol
        hostname: 'cdn-icons-png.flaticon.com', // specify the hostname
      },
    ],
  },
};

export default nextConfig;
