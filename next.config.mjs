/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // 한국어 지원
  i18n: undefined, // App Router에서는 middleware로 처리
};

export default nextConfig;
