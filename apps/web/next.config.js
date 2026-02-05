//@ts-check
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    // Set this to true if you would like to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  // Transpiler les packages locaux (libs partagées)
  transpilePackages: ['@basevitale/shared', '@basevitale/scribe-ui'],
  // Configuration webpack pour résoudre les modules Nx (client ET serveur)
  webpack: (config, { isServer }) => {
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@basevitale/shared': path.resolve(__dirname, '../../libs/shared/src/index.ts'),
      '@basevitale/scribe-ui': path.resolve(__dirname, '../../libs/scribe-ui/src/index.ts'),
    };
    return config;
  },
  // Proxy /api vers l'API NestJS (port 3001). Le front appelle /api en relatif → même origine, pas de CORS.
  async rewrites() {
    const target = process.env.API_BACKEND_URL || 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${target}/api/:path*` }];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  poweredByHeader: false,
  compress: true,
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
