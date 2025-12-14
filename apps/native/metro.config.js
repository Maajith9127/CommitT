const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for monorepo packages
config.watchFolders = [path.resolve(__dirname, "../../")];

// Platform-specific extensions (React Native will pick .native.tsx first)
config.resolver.sourceExts = [
	...config.resolver.sourceExts,
	"native.tsx",
	"native.ts",
];

const uniwindConfig = withUniwindConfig(config, {
	configPath: "./uniwind.config.js",
	cssEntryFile: "./global.css",
	dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;
