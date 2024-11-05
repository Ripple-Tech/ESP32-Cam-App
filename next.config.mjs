/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['drive.google.com', "" ], 
      },
      eslint: {
        dirs: ['utils', ], // Only run ESLint on the 'pages' and 'utils' directories during production builds (next build)
      },
};

export default nextConfig;
