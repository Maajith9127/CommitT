/**
 * App Lister Module — TypeScript Bridge
 *
 * This file is the JavaScript-side entry point for the native Kotlin
 * `AppListerModule`. It re-exports the native module with strict TypeScript
 * types so every consumer gets full IntelliSense and compile-time safety.
 *
 * ARCHITECTURE:
 *   choose.tsx → imports from here → requireNativeModule → Kotlin AppListerModule
 *
 * IMPORTANT:
 *   - The string "AppListerModule" must exactly match `Name("AppListerModule")`
 *     in the Kotlin `ModuleDefinition`.
 *   - If you add new native functions in Kotlin, update `AppListerModuleType`
 *     here so the TS compiler catches mismatches at build time.
 *
 * @see android/src/main/java/expo/modules/applister/AppListerModule.kt
 */
import { requireNativeModule } from "expo-modules-core";

/** Represents a single installed application returned from the native layer. */
export type InstalledApp = {
  /** Unique Android package name (e.g. "com.google.chrome"). Used as React `key`. */
  id: string;
  /** Human-readable app label pulled from Android's PackageManager (e.g. "Chrome"). */
  name: string;
  /** Base64-encoded PNG data URI for the app icon, or null if extraction failed.
   *  Can be passed directly to `<Image source={{ uri: iconBase64 }}>`. */
  iconBase64: string | null;
  /** Toggle state managed by the JS UI layer. Always `false` from native. */
  selected: boolean;
};

/** Type-safe contract matching the Kotlin AsyncFunction exports. */
type AppListerModuleType = {
  /** Fetches all user-visible installed applications from the device.
   *  @returns A promise resolving to an A-Z sorted array of InstalledApp objects. */
  getInstalledApps: () => Promise<InstalledApp[]>;
};

export const AppListerModule = requireNativeModule<AppListerModuleType>("AppListerModule");
