import "dotenv/config";

const config = {
  expo: {
    scheme: "commit",
    userInterfaceStyle: "automatic",
    orientation: "default",
    web: {
      bundler: "metro",
    },
    name: "commit",
    slug: "commit",
    plugins: [
      "expo-font",
      "expo-sqlite",
      "@react-native-google-signin/google-signin",
      [
        "expo-maps",
        {
          requestLocationPermission: true,
          locationPermission: "Allow commit to use your location",
        },
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    android: {
      package: "com.mono.commit",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
    },
    ios: {
      bundleIdentifier: "com.mono.commit",
    },
  },
};

export default config;
