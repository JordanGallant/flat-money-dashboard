/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Add this if you're using app directory
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
