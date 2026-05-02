/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable trailing slash redirects for webhooks
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
