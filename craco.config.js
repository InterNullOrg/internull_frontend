const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add polyfills for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "assert": require.resolve("assert"),
        "buffer": require.resolve("buffer"),
        "crypto": require.resolve("crypto-browserify"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "path": require.resolve("path-browserify"),
        "stream": require.resolve("stream-browserify"),
        "url": require.resolve("url"),
        "util": require.resolve("util"),
        "constants": require.resolve("constants-browserify"),
        "process": require.resolve("process/browser"),
        "process/browser": require.resolve("process/browser"),
        "vm": false,
        "fs": false,
        "net": false,
        "tls": false
      };

      // Ensure extensions are resolved properly for ESM modules
      webpackConfig.resolve.extensions = [
        '.js', '.mjs', '.jsx', '.json', '.ts', '.tsx', ...webpackConfig.resolve.extensions || []
      ];

      // Add rule to handle .mjs files
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false // Disable the fully specified requirement for .mjs files
        }
      });

      // Add plugins for global variables
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      ];

      // Ignore certain warnings from WalletConnect and Solana libraries
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Critical dependency: the request of a dependency is an expression/,
        /Can't resolve 'process\/browser'/
      ];

      return webpackConfig;
    },
  },
};