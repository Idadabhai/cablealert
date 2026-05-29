/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'cablealert.io',
        'www.cablealert.io',
        '*.vercel.app',
      ],
    },
  },
};

export default nextConfig;
