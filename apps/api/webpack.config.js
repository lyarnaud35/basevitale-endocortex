const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  // Configuration pour résoudre les imports @basevitale/shared
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...config.resolve.alias,
    '@basevitale/shared': path.resolve(__dirname, '../../libs/shared/src/index.ts'),
  };
  
  // Configurer ts-loader pour ignorer les erreurs TS6305 (shared library non buildée)
  if (config.module && config.module.rules) {
    const tsRule = config.module.rules.find((rule) =>
      rule.test && rule.test.toString().includes('ts')
    );
    if (tsRule && tsRule.use) {
      const use = tsRule.use;
      const tsLoader = Array.isArray(use)
        ? use.find((u) => u && u.loader && String(u.loader).includes('ts-loader'))
        : use && use.loader && String(use.loader).includes('ts-loader')
          ? use
          : null;
      if (tsLoader && typeof tsLoader === 'object' && tsLoader.options) {
        const opts = tsLoader.options;
        opts.reportFiles = opts.reportFiles || [];
        opts.reportFiles.push('!**/libs/shared/**/*.d.ts');
      }
    }
  }
  
  return config;
});
