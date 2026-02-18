package expo.modules.scheduler

import android.database.sqlite.SQLiteDatabase
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.util.Calendar
import java.util.concurrent.ConcurrentHashMap

class SchedulerModule : Module() {

    companion object {
        private const val TAG = "SchedulerModule"
    }

    // ═════════════════════════════════════════════════════════════════════
    // In-memory chain tracking: convexId → active Runnable
    // ═════════════════════════════════════════════════════════════════════
    private val activeChains = ConcurrentHashMap<String, Runnable>()
    private val handler = Handler(Looper.getMainLooper())

    override fun definition() = ModuleDefinition {

        Name("SchedulerModule")

        Function("scheduleForTask") { convexId: String ->
            scheduleChain(convexId)
        }

        Function("rescheduleForTask") { convexId: String ->
            cancelChainInternal(convexId)
            scheduleChain(convexId)
        }

        Function("cancelForTask") { convexId: String ->
            cancelChainInternal(convexId)
            mapOf("success" to true, "cancelled" to convexId)
        }

        Function("getActiveChains") {
            activeChains.keys().toList()
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Chain Logic
    // ═════════════════════════════════════════════════════════════════════

    private fun scheduleChain(convexId: String): Map<String, Any?> {
        val context = appContext.reactContext
            ?: return mapOf("success" to false, "error" to "No context")

        val dbFile = getDbFile()
            ?: return mapOf("success" to false, "error" to "Local DB not found")

        val db = SQLiteDatabase.openDatabase(
            dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY
        )

        val title: String
        val recurrenceJson: String

        try {
            val cursor = db.rawQuery(
                "SELECT title, recurrence_json FROM local_tasks WHERE convex_id = ?",
                arrayOf(convexId)
            )

            if (!cursor.moveToFirst()) {
                cursor.close()
                db.close()
                return mapOf("success" to false, "error" to "Task not found: $convexId")
            }

            title = cursor.getString(0)
            recurrenceJson = cursor.getString(1)
            cursor.close()
        } finally {
            db.close()
        }

        val recurrence = JSONObject(recurrenceJson)
        val timeWindows = recurrence.optJSONArray("time_windows") ?: JSONArray()

        if (timeWindows.length() == 0) {
            return mapOf("success" to false, "error" to "No time windows for '$title'")
        }

        // Find next slot (search from NOW)
        val now = System.currentTimeMillis()
        val nextSlot = findNextTimeSlot(recurrence, now)
            ?: return mapOf("success" to false, "error" to "No upcoming slot for '$title'")

        val delayMs = nextSlot.startTimeMs - now

        Log.d(TAG, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        Log.d(TAG, "📋 Task: '$title'")
        Log.d(TAG, "📋 ConvexId: $convexId")
        Log.d(TAG, "📋 Recurrence: $recurrenceJson")
        Log.d(TAG, "📋 Next slot: ${formatTime(nextSlot.startTimeMs)}")
        Log.d(TAG, "📋 Delay: ${delayMs / 1000}s (${delayMs / 60000}min)")
        Log.d(TAG, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        // Build the chain runnable
        val chainRunnable = object : Runnable {
            override fun run() {
                Log.d(TAG, "⏰ CHAIN FIRED for '$title' at ${formatTime(System.currentTimeMillis())}")

                // Show the toast
                Toast.makeText(context, "⏰ Time for: '$title'!", Toast.LENGTH_LONG).show()

                // CHAIN: Find the NEXT slot (must start AFTER current window's end)
                try {
                    val nextRecurrence = JSONObject(recurrenceJson)

                    // For "once" type, don't chain
                    if (nextRecurrence.optString("type") == "once") {
                        Log.d(TAG, "🔚 Task '$title' is one-time. Chain ends.")
                        activeChains.remove(convexId)
                        return
                    }

                    // KEY FIX: Search from the END of the current window, not from now.
                    // This ensures we skip the current window and find the NEXT one.
                    val searchAfter = nextSlot.endTimeMs
                    Log.d(TAG, "🔍 Searching for next slot after ${formatTime(searchAfter)}")

                    val nextNextSlot = findNextTimeSlot(nextRecurrence, searchAfter)
                    if (nextNextSlot != null) {
                        val nextDelay = nextNextSlot.startTimeMs - System.currentTimeMillis()
                        Log.d(TAG, "📅 Next chain: '${title}' → ${formatTime(nextNextSlot.startTimeMs)} (delay: ${nextDelay / 1000}s)")

                        if (nextDelay > 0) {
                            // Build a NEW runnable for the next link (with updated slot reference)
                            val nextRunnable = buildChainRunnable(
                                convexId, title, recurrenceJson, nextNextSlot, context
                            )
                            handler.postDelayed(nextRunnable, nextDelay)
                            activeChains[convexId] = nextRunnable
                        } else {
                            Log.d(TAG, "⚠️ Next slot is in the past. Chain ends for '$title'.")
                            activeChains.remove(convexId)
                        }
                    } else {
                        Log.d(TAG, "🔚 No more slots for '$title'. Chain ends.")
                        activeChains.remove(convexId)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Chain error for '$title': ${e.message}")
                    activeChains.remove(convexId)
                }
            }
        }

        // Cancel any existing chain first
        cancelChainInternal(convexId)

        // Schedule
        if (delayMs <= 0) {
            handler.post(chainRunnable)
        } else {
            handler.postDelayed(chainRunnable, delayMs)
        }

        activeChains[convexId] = chainRunnable

        val cal = Calendar.getInstance()
        cal.timeInMillis = nextSlot.startTimeMs

        return mapOf(
            "success" to true,
            "taskTitle" to title,
            "nextAlarmMs" to nextSlot.startTimeMs,
            "nextAlarmReadable" to String.format(
                "%tA %<tB %<td at %<tI:%<tM %<tp", cal
            ),
            "delayMs" to delayMs,
            "dayOfWeek" to nextSlot.dayOfWeek,
            "activeChainsCount" to activeChains.size
        )
    }

    /**
     * Build a chain runnable for subsequent links.
     * Each link knows its own slot's end time, so the NEXT search starts after it.
     */
    private fun buildChainRunnable(
        convexId: String,
        title: String,
        recurrenceJson: String,
        currentSlot: TimeSlotResult,
        context: android.content.Context
    ): Runnable {
        return object : Runnable {
            override fun run() {
                Log.d(TAG, "⏰ CHAIN FIRED for '$title' at ${formatTime(System.currentTimeMillis())}")
                Toast.makeText(context, "⏰ Time for: '$title'!", Toast.LENGTH_LONG).show()

                try {
                    val recurrence = JSONObject(recurrenceJson)

                    if (recurrence.optString("type") == "once") {
                        Log.d(TAG, "🔚 One-time task '$title'. Chain ends.")
                        activeChains.remove(convexId)
                        return
                    }

                    // Search AFTER the current window's end time
                    val searchAfter = currentSlot.endTimeMs
                    Log.d(TAG, "🔍 Searching for next slot after ${formatTime(searchAfter)}")

                    val nextSlot = findNextTimeSlot(recurrence, searchAfter)
                    if (nextSlot != null) {
                        val nextDelay = nextSlot.startTimeMs - System.currentTimeMillis()
                        Log.d(TAG, "📅 Next chain: '$title' → ${formatTime(nextSlot.startTimeMs)} (delay: ${nextDelay / 1000}s)")

                        if (nextDelay > 0) {
                            val nextRunnable = buildChainRunnable(
                                convexId, title, recurrenceJson, nextSlot, context
                            )
                            handler.postDelayed(nextRunnable, nextDelay)
                            activeChains[convexId] = nextRunnable
                        } else {
                            Log.d(TAG, "⚠️ Next slot in the past. Chain ends for '$title'.")
                            activeChains.remove(convexId)
                        }
                    } else {
                        Log.d(TAG, "🔚 No more slots. Chain ends for '$title'.")
                        activeChains.remove(convexId)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Chain error for '$title': ${e.message}")
                    activeChains.remove(convexId)
                }
            }
        }
    }

    private fun cancelChainInternal(convexId: String) {
        val existingRunnable = activeChains.remove(convexId)
        if (existingRunnable != null) {
            handler.removeCallbacks(existingRunnable)
            Log.d(TAG, "🚫 Cancelled chain for: $convexId")
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Scheduler Logic
    //
    // KEY PARAMETER: afterMs
    //   - For initial schedule: pass System.currentTimeMillis()
    //   - For chain continuation: pass the PREVIOUS slot's endTimeMs
    //   This ensures the chain always moves FORWARD and never repeats.
    // ═════════════════════════════════════════════════════════════════════

    data class TimeSlotResult(
        val startTimeMs: Long,
        val endTimeMs: Long,
        val dayOfWeek: Int
    )

    /**
     * Find the next time slot that starts AFTER [afterMs].
     */
    private fun findNextTimeSlot(recurrence: JSONObject, afterMs: Long): TimeSlotResult? {
        val type = recurrence.optString("type", "daily")
        val timeWindows = recurrence.optJSONArray("time_windows") ?: return null
        val daysOfWeekArr = recurrence.optJSONArray("days_of_week")

        if (timeWindows.length() == 0) return null

        val windows = mutableListOf<Pair<Int, Int>>()
        for (i in 0 until timeWindows.length()) {
            val w = timeWindows.getJSONObject(i)
            windows.add(Pair(w.getInt("start"), w.getInt("end")))
        }
        windows.sortBy { it.first }

        val daysToCheck = mutableListOf<Int>()
        when (type) {
            "once", "daily" -> daysToCheck.addAll(listOf(0, 1, 2, 3, 4, 5, 6))
            "weekly", "custom" -> {
                if (daysOfWeekArr != null && daysOfWeekArr.length() > 0) {
                    for (i in 0 until daysOfWeekArr.length()) {
                        var day = daysOfWeekArr.getInt(i)
                        if (day == 7) day = 0
                        daysToCheck.add(day)
                    }
                    daysToCheck.sort()
                } else {
                    daysToCheck.addAll(listOf(0, 1, 2, 3, 4, 5, 6))
                }
            }
            else -> daysToCheck.addAll(listOf(0, 1, 2, 3, 4, 5, 6))
        }

        // Use afterMs as the reference time
        val cal = Calendar.getInstance()
        cal.timeInMillis = afterMs

        val refDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1
        val refSecsFromMidnight =
            cal.get(Calendar.HOUR_OF_DAY) * 3600 +
            cal.get(Calendar.MINUTE) * 60 +
            cal.get(Calendar.SECOND)

        val todayCal = Calendar.getInstance()
        todayCal.timeInMillis = afterMs
        todayCal.set(Calendar.HOUR_OF_DAY, 0)
        todayCal.set(Calendar.MINUTE, 0)
        todayCal.set(Calendar.SECOND, 0)
        todayCal.set(Calendar.MILLISECOND, 0)
        val refDayStartMs = todayCal.timeInMillis

        Log.d(TAG, "🔍 findNextTimeSlot: afterMs=${formatTime(afterMs)}, refDay=$refDayOfWeek, refSecs=$refSecsFromMidnight")
        Log.d(TAG, "🔍 Windows: ${windows.map { "(${it.first}-${it.second})" }}")
        Log.d(TAG, "🔍 Days to check: $daysToCheck")

        for (dayOffset in 0..7) {
            val checkDayOfWeek = (refDayOfWeek + dayOffset) % 7
            if (!daysToCheck.contains(checkDayOfWeek)) continue

            val checkDayStartMs = refDayStartMs + dayOffset * 86400000L

            for ((startSecs, endSecs) in windows) {
                val windowStartMs = checkDayStartMs + startSecs * 1000L

                // KEY: Skip any window that STARTS before our reference time
                // This is what makes the chain move forward
                if (windowStartMs < afterMs) {
                    Log.d(TAG, "🔍 Skipping window ${startSecs}-${endSecs} (starts before afterMs)")
                    continue
                }

                val windowEndMs = checkDayStartMs + endSecs * 1000L

                Log.d(TAG, "✅ Found slot: ${formatTime(windowStartMs)} - ${formatTime(windowEndMs)} (day $checkDayOfWeek)")

                return TimeSlotResult(
                    startTimeMs = windowStartMs,
                    endTimeMs = windowEndMs,
                    dayOfWeek = checkDayOfWeek
                )
            }
        }

        Log.d(TAG, "❌ No slot found after ${formatTime(afterMs)}")
        return null
    }

    // ═════════════════════════════════════════════════════════════════════
    // Helpers
    // ═════════════════════════════════════════════════════════════════════

    private fun getDbFile(): File? {
        val context = appContext.reactContext ?: return null
        val expoPath = File(context.filesDir, "SQLite/commit.db")
        if (expoPath.exists()) return expoPath
        val standardPath = context.getDatabasePath("commit.db")
        if (standardPath.exists()) return standardPath
        return null
    }

    private fun formatTime(ms: Long): String {
        val cal = Calendar.getInstance()
        cal.timeInMillis = ms
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", cal)
    }
}
