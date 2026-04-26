import { requireNativeModule } from "expo-modules-core";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LOGCAT MODULE — Persistent System Log Recorder
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Bridges to a native Kotlin daemon that continuously pipes the Android
 * system logcat (filtered by this app's PID) into persistent daily log files.
 *
 * These logs contain EVERYTHING that `adb logcat` shows:
 *   - ReactNativeJS console.log/warn/error
 *   - BlockerAccessibilityService native enforcement events
 *   - AlarmScheduler hardware alarm decisions
 *   - SchedulerModule JS↔Native bridge calls
 *   - React Native lifecycle events (onHostPause/Resume)
 *   - OkHttp/WebSocket connection events
 *   - System GC and memory events
 *
 * LIFECYCLE:
 *   Recording starts AUTOMATICALLY when the app process is created.
 *   Logs persist across app swipes and phone restarts.
 *   Logs are NEVER auto-deleted — only `clearLogs()` wipes them.
 *
 * FILE STRUCTURE:
 *   /data/data/com.mono.commit/files/logcat-recordings/
 *     ├── commit-logcat-2026-04-24.log
 *     ├── commit-logcat-2026-04-25.log
 *     └── commit-logcat-2026-04-26.log
 *
 * Execution Chain:
 *   JS Context → LogcatModule (Bridge) → LogcatRecorder (Daemon Thread)
 *   → Runtime.exec("logcat") → BufferedWriter → Persistent File
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface LogcatModuleType {
  startRecording(): boolean;
  stopRecording(): boolean;
  getCurrentLogPath(): string;
  getAllLogPaths(): string[];
  getTotalLogSize(): number;
  isRecording(): boolean;
  clearLogs(): number;
  /** Returns true if the app can write to /sdcard/Documents/ (always true on Android ≤10) */
  hasStoragePermission(): boolean;
  /** Opens the Android "All Files Access" settings page for the user to grant permission */
  requestStoragePermission(): boolean;
}

export const LogcatModule = requireNativeModule<LogcatModuleType>("LogcatModule");
