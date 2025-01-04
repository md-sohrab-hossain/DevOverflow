import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty'],
  images: {
    remotePatterns: [
      {
        protocol: 'https', // specify the protocol
        hostname: 'cdn-icons-png.flaticon.com', // specify the hostname
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
      },
    ],
  },
};

export default nextConfig;
