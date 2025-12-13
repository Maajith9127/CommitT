export default {
	expo: {
		scheme: "mono",
		userInterfaceStyle: "automatic",
		orientation: "default",
		web: {
			bundler: "metro",
		},
		name: "mono",
		slug: "mono",
		plugins: ["expo-font", "@react-native-google-signin/google-signin"],
		experiments: {
			typedRoutes: true,
			reactCompiler: true,
		},

		//  THIS IS THE FIX
		newArchEnabled: false,
		android: {
			package: "com.anonymous.mono",
		},
		ios: {
			bundleIdentifier: "com.anonymous.mono",
		},

		//  You can add env support later like this:
		extra: {
			// Example:
			// apiUrl: process.env.API_URL,
			// wsUrl: process.env.WS_URL,
		},
	},
};
