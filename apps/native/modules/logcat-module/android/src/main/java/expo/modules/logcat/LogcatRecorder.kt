package expo.modules.logcat

import android.os.Process
import android.util.Log
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.File
import java.io.FileWriter
import java.io.InputStreamReader
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LOGCAT RECORDER — The "Infinite Black Box Flight Recorder"
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROBLEM:
 * The Android system logcat buffer is tiny (64KB–1MB depending on OEM).
 * Under heavy CommitT activity (sync cycles, alarm scheduling, accessibility
 * service events), the buffer wraps around in under 2 minutes, destroying
 * evidence needed to debug penalty misfires or sync corruption.
 *
 * SOLUTION:
 * This class launches a background daemon thread that:
 *   1. Starts a `logcat` process filtered to THIS app's PID.
 *   2. Reads every line from the process stdout in real-time.
 *   3. Appends each line to a persistent file on internal storage.
 *   4. Uses daily file rotation (one file per day) for manageability.
 *   5. Survives app swipes (runs as long as the process lives).
 *   6. On next app launch, picks up a NEW logcat session and APPENDS.
 *
 * The resulting log file contains EVERYTHING that `adb logcat` shows:
 *   - ReactNativeJS console.log/warn/error
 *   - BlockerAccessibilityService native enforcement events
 *   - AlarmScheduler hardware alarm decisions
 *   - SchedulerModule JS↔Native bridge calls
 *   - React Native lifecycle events (onHostPause/Resume)
 *   - OkHttp/WebSocket connection events
 *   - System GC and memory events
 *
 * MANUAL CLEAR ONLY:
 *   Logs are NEVER auto-deleted. They persist across app kills and phone
 *   restarts. Only an explicit call to `clearLogs()` wipes the files.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
class LogcatRecorder(private val logDir: File) {

    companion object {
        private const val TAG = "LogcatRecorder"
        private const val LOG_PREFIX = "commit-logcat-"
        private const val LOG_EXTENSION = ".log"

        /**
         * Maximum size per daily log file (50MB).
         * At this size, a single day's file is still easily searchable.
         * If a single day exceeds this, the file is closed and a new
         * segment is started with a numeric suffix.
         */
        private const val MAX_FILE_SIZE_BYTES = 50L * 1024L * 1024L
    }

    private val isRunning = AtomicBoolean(false)
    private var logcatProcess: java.lang.Process? = null
    private var readerThread: Thread? = null
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    /**
     * Starts the background logcat pipe.
     * Idempotent — calling this multiple times has no effect if already running.
     */
    fun start() {
        if (isRunning.getAndSet(true)) {
            Log.i(TAG, "Already recording. Ignoring duplicate start().")
            return
        }

        // Ensure the log directory exists
        if (!logDir.exists()) {
            logDir.mkdirs()
        }

        val pid = Process.myPid()
        Log.i(TAG, "==== [LOGCAT RECORDER ARMED] ====")
        Log.i(TAG, "[CONFIG] PID: $pid | Log Dir: ${logDir.absolutePath}")

        readerThread = Thread({
            try {
                // Start the logcat process filtered by our PID.
                // -v threadtime: Most detailed format (date, time, PID, TID, priority, tag)
                // --pid: Filter to only this app's process
                // NO -d flag: This makes it FOLLOW (like tail -f), not dump-and-exit
                val command = arrayOf("logcat", "-v", "threadtime", "--pid=$pid")
                logcatProcess = Runtime.getRuntime().exec(command)

                val reader = BufferedReader(InputStreamReader(logcatProcess!!.inputStream))
                var currentDate = dateFormat.format(Date())
                var writer = openWriter(currentDate)
                var currentFileSize = getLogFile(currentDate).length()

                // Write a session header
                val sessionHeader = "\n\n" +
                    "════════════════════════════════════════════════════════════════\n" +
                    "  NEW SESSION STARTED: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(Date())}\n" +
                    "  PID: $pid\n" +
                    "════════════════════════════════════════════════════════════════\n\n"
                writer.write(sessionHeader)
                writer.flush()
                currentFileSize += sessionHeader.length

                Log.i(TAG, "[PIPE ACTIVE] Background thread reading logcat stream...")

                var line: String?
                while (isRunning.get()) {
                    line = reader.readLine()
                    if (line == null) break // Process died

                    // Check if the date has rolled over (midnight)
                    val nowDate = dateFormat.format(Date())
                    if (nowDate != currentDate) {
                        writer.flush()
                        writer.close()
                        currentDate = nowDate
                        writer = openWriter(currentDate)
                        currentFileSize = getLogFile(currentDate).length()
                        Log.i(TAG, "[DATE ROTATION] New log file for: $currentDate")
                    }

                    // Check if we need to segment the file (50MB limit per segment)
                    if (currentFileSize > MAX_FILE_SIZE_BYTES) {
                        writer.flush()
                        writer.close()
                        // Create a segmented file: commit-logcat-2026-04-26_002.log
                        val segmentFile = getNextSegmentFile(currentDate)
                        writer = BufferedWriter(FileWriter(segmentFile, true))
                        currentFileSize = 0
                        Log.i(TAG, "[SEGMENT ROTATION] File exceeded 50MB. New segment: ${segmentFile.name}")
                    }

                    writer.write(line)
                    writer.newLine()
                    currentFileSize += line.length + 1

                    // Flush every 50 lines to balance performance with data safety
                    // (In case the process is killed, we lose at most 50 lines)
                    if (currentFileSize % 50 == 0L) {
                        writer.flush()
                    }
                }

                writer.flush()
                writer.close()
                reader.close()

            } catch (e: Exception) {
                Log.e(TAG, "[FATAL] Logcat pipe thread crashed: ${e.message}", e)
            } finally {
                isRunning.set(false)
                logcatProcess?.destroy()
                Log.i(TAG, "[PIPE CLOSED] Background logcat recording stopped.")
            }
        }, "CommitT-LogcatPipe")

        readerThread!!.isDaemon = true // Don't prevent JVM shutdown
        readerThread!!.priority = Thread.MIN_PRIORITY // Lowest priority — never steal CPU from the app
        readerThread!!.start()
    }

    /**
     * Stops the background logcat pipe gracefully.
     */
    fun stop() {
        Log.i(TAG, "Stopping logcat recorder...")
        isRunning.set(false)
        logcatProcess?.destroy()
        readerThread?.interrupt()
    }

    /**
     * Clears ALL persistent log files. This is the ONLY way logs are deleted.
     * @return Number of files deleted.
     */
    fun clearLogs(): Int {
        stop()

        var deleted = 0
        val files = logDir.listFiles { _, name -> name.startsWith(LOG_PREFIX) }
        files?.forEach { file ->
            if (file.delete()) deleted++
        }

        Log.i(TAG, "[CLEAR] Deleted $deleted log files.")

        // Restart recording after clear
        start()
        return deleted
    }

    /**
     * Returns the path to today's log file for the JS layer to read.
     */
    fun getCurrentLogPath(): String {
        val today = dateFormat.format(Date())
        return getLogFile(today).absolutePath
    }

    /**
     * Returns paths to ALL log files, sorted by date (newest first).
     */
    fun getAllLogPaths(): List<String> {
        val files = logDir.listFiles { _, name -> name.startsWith(LOG_PREFIX) }
            ?: return emptyList()
        return files
            .sortedByDescending { it.name }
            .map { it.absolutePath }
    }

    /**
     * Returns the total size of all log files in bytes.
     */
    fun getTotalLogSize(): Long {
        val files = logDir.listFiles { _, name -> name.startsWith(LOG_PREFIX) }
            ?: return 0
        return files.sumOf { it.length() }
    }

    /**
     * Returns whether the recorder is currently active.
     */
    fun isRecording(): Boolean = isRunning.get()

    // ─── PRIVATE HELPERS ────────────────────────────────────────────────────

    private fun getLogFile(date: String): File {
        return File(logDir, "$LOG_PREFIX$date$LOG_EXTENSION")
    }

    private fun openWriter(date: String): BufferedWriter {
        val file = getLogFile(date)
        return BufferedWriter(FileWriter(file, true)) // true = append mode
    }

    private fun getNextSegmentFile(date: String): File {
        var segment = 1
        var file: File
        do {
            file = File(logDir, "${LOG_PREFIX}${date}_${String.format("%03d", segment)}$LOG_EXTENSION")
            segment++
        } while (file.exists())
        return file
    }
}
