// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add workspace resolution
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "./node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];

config.resolver.extraNodeModules = {
  "monitoring-mobile": path.resolve(__dirname, "../../packages/monitoring-mobile"),
};

config.watchFolders = [
  path.resolve(__dirname, "../../packages/monitoring-mobile"),
];

module.exports = config;
