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
  transpilePackages: ['@basevitale/shared'],
  // Configuration webpack pour résoudre les modules Nx (client ET serveur)
  webpack: (config, { isServer }) => {
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@basevitale/shared': path.resolve(__dirname, '../../libs/shared/src/index.ts'),
    };
    return config;
  },
  // Configuration pour le développement
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  // Améliorer les performances
  poweredByHeader: false,
  compress: true,
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
