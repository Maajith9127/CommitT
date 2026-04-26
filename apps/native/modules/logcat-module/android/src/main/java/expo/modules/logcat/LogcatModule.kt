package expo.modules.logcat

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LOGCAT MODULE — JS Bridge for the Persistent Flight Recorder
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Expo Module that exposes the [LogcatRecorder] to the React Native layer.
 * Auto-starts recording on module initialization so that logs begin flowing
 * the moment the app process is created.
 *
 * STORAGE STRATEGY:
 *   Logs are written to /sdcard/Documents/CommitT/logs/ (public storage).
 *   This ensures logs SURVIVE app uninstalls, making them truly permanent.
 *   Only a manual clearLogs() call or physically deleting the folder wipes them.
 *
 *   Fallback: If public storage is unavailable (permissions not granted),
 *   falls back to internal app storage (context.filesDir).
 *
 * ## Usage from React Native
 * ```typescript
 * import { LogcatModule } from 'modules/logcat-module';
 *
 * LogcatModule.startRecording();
 * const path = LogcatModule.getCurrentLogPath();
 * const allPaths = LogcatModule.getAllLogPaths();
 * const sizeBytes = LogcatModule.getTotalLogSize();
 * LogcatModule.clearLogs();
 * ```
 *
 * @see LogcatRecorder The core recording engine.
 * ─────────────────────────────────────────────────────────────────────────────
 */
class LogcatModule : Module() {

    private var recorder: LogcatRecorder? = null

    /**
     * Resolves the best available log directory:
     * 1. /sdcard/Documents/CommitT/logs/ (survives uninstall)
     * 2. Fallback: context.filesDir/logcat-recordings/ (internal, wiped on uninstall)
     */
    private fun resolveLogDir(): File {
        // On Android 11+ (API 30+), check MANAGE_EXTERNAL_STORAGE
        // On Android 10 and below, WRITE_EXTERNAL_STORAGE is sufficient
        val canUsePublic = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED
        }

        return if (canUsePublic) {
            val publicDir = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS),
                "CommitT/logs"
            )
            if (!publicDir.exists()) publicDir.mkdirs()
            Log.i("LogcatModule", "[STORAGE] Using PUBLIC Documents: ${publicDir.absolutePath}")
            publicDir
        } else {
            val context = appContext.reactContext
            val internalDir = File(context?.filesDir ?: File("/tmp"), "logcat-recordings")
            if (!internalDir.exists()) internalDir.mkdirs()
            Log.w("LogcatModule", "[STORAGE] Public storage unavailable. Falling back to INTERNAL: ${internalDir.absolutePath}")
            internalDir
        }
    }

    override fun definition() = ModuleDefinition {
        Name("LogcatModule")

        /**
         * AUTO-START: Begin recording the moment the native module is loaded.
         * This ensures we capture logs from the very first frame of the app,
         * including React Native bridge initialization and initial sync.
         */
        OnCreate {
            try {
                val logDir = resolveLogDir()
                recorder = LogcatRecorder(logDir)
                recorder?.start()
                Log.i("LogcatModule", "[AUTO-START] Logcat recorder armed. Dir: ${logDir.absolutePath}")
            } catch (e: Exception) {
                Log.e("LogcatModule", "[AUTO-START FAILED] ${e.message}", e)
            }
        }

        /**
         * Manually starts the logcat recording. Idempotent.
         */
        Function("startRecording") {
            if (recorder == null) {
                val logDir = resolveLogDir()
                recorder = LogcatRecorder(logDir)
            }
            recorder?.start()
            true
        }

        /**
         * Stops the logcat recording.
         */
        Function("stopRecording") {
            recorder?.stop()
            true
        }

        /**
         * Returns the absolute path to today's log file.
         * The JS layer can read this file via expo-file-system.
         */
        Function("getCurrentLogPath") {
            recorder?.getCurrentLogPath() ?: ""
        }

        /**
         * Returns an array of ALL log file paths, sorted newest-first.
         * Enables the JS layer to display a "Log History" with daily entries.
         */
        Function("getAllLogPaths") {
            recorder?.getAllLogPaths() ?: emptyList<String>()
        }

        /**
         * Returns the total disk usage of all log files in bytes.
         * Useful for displaying storage usage in the Settings screen.
         */
        Function("getTotalLogSize") {
            recorder?.getTotalLogSize() ?: 0L
        }

        /**
         * Returns whether the recorder is currently active.
         */
        Function("isRecording") {
            recorder?.isRecording() ?: false
        }

        /**
         * Clears ALL persistent log files. This is the ONLY way to free
         * the disk space used by logs. After clearing, recording restarts
         * automatically.
         *
         * @return Number of files deleted.
         */
        Function("clearLogs") {
            recorder?.clearLogs() ?: 0
        }

        /**
         * Checks if the app has the MANAGE_EXTERNAL_STORAGE permission.
         * On Android 10 and below, this always returns true (not needed).
         */
        Function("hasStoragePermission") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Environment.isExternalStorageManager()
            } else {
                true
            }
        }

        /**
         * Opens the Android "All Files Access" settings page where the user
         * can grant MANAGE_EXTERNAL_STORAGE to CommitT.
         * Only needed on Android 11+ (API 30+).
         */
        Function("requestStoragePermission") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.data = Uri.parse("package:${appContext.reactContext?.packageName}")
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    appContext.reactContext?.startActivity(intent)
                    true
                } catch (e: Exception) {
                    // Fallback: Open the general storage management page
                    val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    appContext.reactContext?.startActivity(intent)
                    true
                }
            } else {
                true // Not needed on older Android
            }
        }
    }
}
