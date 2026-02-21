package expo.modules.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.Calendar

/**
 * Shared alarm scheduling logic.
 * Used by SchedulerModule (from JS), AlarmReceiver (chain), and BootReceiver (restart).
 * Now supports repeating pre-alarms that skip if overlapping with prior tasks.
 */
object AlarmScheduler {
    private const val TAG = "AlarmScheduler"

    // ═════════════════════════════════════════════════════════════════════
    // Schedule / Cancel / Chain
    // ═════════════════════════════════════════════════════════════════════

    /**
     * Schedule the next alarm for a task. Reads recurrence from local DB.
     */
    fun scheduleAlarm(context: Context, convexId: String): Map<String, Any?> {
        Log.d(TAG, "═══════════════════════════════════════════════")
        Log.d(TAG, "📅 scheduleAlarm() called for convexId=$convexId")
        Log.d(TAG, "📅 Current time: ${formatTime(System.currentTimeMillis())}")
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "❌ DB not found! Checked: ${context.filesDir}/SQLite/commit.db and ${context.getDatabasePath("commit.db")}")
            return mapOf("success" to false, "error" to "DB not found")
        }
        Log.d(TAG, "📅 DB found at: ${dbFile.absolutePath}")

        val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)

        try {
            val cursor = db.rawQuery(
                "SELECT id, title, recurrence_json FROM local_tasks WHERE convex_id = ?",
                arrayOf(convexId)
            )

            if (!cursor.moveToFirst()) {
                cursor.close()
                return mapOf("success" to false, "error" to "Task not found: $convexId")
            }

            val localId = cursor.getString(0)
            val title = cursor.getString(1)
            val recurrenceJson = cursor.getString(2)
            cursor.close()

            val recurrence = JSONObject(recurrenceJson)
            val now = System.currentTimeMillis()

            // Cancel any existing alarm for this task (Main + Pre-alarms)
            cancelAlarmForTask(context, db, localId, convexId)

            // 1. Determine how many instances to pre-calculate
            val endsObj = recurrence.optJSONObject("ends")
            val count = if (endsObj?.optString("type") == "after") endsObj.optInt("count", 0) else 1
            
            Log.d(TAG, "📅 Task '$title': Pre-calculating $count instances...")

            var lastSlotEnd = now
            var firstSlot: TimeSlotResult? = null

            db.beginTransaction()
            try {
                for (i in 0 until count) {
                    val slot = findNextTimeSlot(recurrence, lastSlotEnd) ?: break
                    if (i == 0) firstSlot = slot

                    val alarmId = (convexId.hashCode() and 0x7FFFFFFF)
                    db.execSQL(
                        """INSERT INTO scheduled_alarms (task_id, fire_at, instance_start, instance_end, os_alarm_id, created_at)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        arrayOf<Any>(localId, slot.startTimeMs, slot.startTimeMs, slot.endTimeMs, alarmId, now)
                    )
                    lastSlotEnd = slot.endTimeMs
                }
                db.setTransactionSuccessful()
            } finally {
                db.endTransaction()
            }

            if (firstSlot == null) {
                return mapOf("success" to false, "error" to "No upcoming slot for '$title'")
            }

            // 2. Set the OS-level alarm for the FIRST instance
            val alarmId = (convexId.hashCode() and 0x7FFFFFFF)
            setAlarm(context, alarmId, firstSlot.startTimeMs, convexId, title, recurrenceJson, firstSlot.endTimeMs)

            // 3. Pre-Alarm Logic (only for the first instance)
            val preAlarmsToSave = mutableListOf<Map<String, Any>>()
            for (offset in 15 downTo 1 step 2) {
                val preAlarmTimeMs = firstSlot.startTimeMs - (offset * 60 * 1000L)
                if (preAlarmTimeMs <= now) continue

                val minTime = preAlarmTimeMs - 5 * 60 * 1000L
                val maxTime = preAlarmTimeMs + 5 * 60 * 1000L
                val conflictCursor = db.rawQuery(
                    "SELECT COUNT(*) FROM scheduled_alarms WHERE task_id != ? AND instance_end >= ? AND instance_start <= ?",
                    arrayOf(localId, minTime.toString(), maxTime.toString())
                )
                var hasConflict = false
                if (conflictCursor.moveToFirst()) {
                    hasConflict = conflictCursor.getInt(0) > 0
                }
                conflictCursor.close()

                if (!hasConflict) {
                    val preAlarmId = ("${convexId}_pre_${offset}").hashCode() and 0x7FFFFFFF
                    db.execSQL(
                        "INSERT INTO scheduled_alarms (task_id, fire_at, instance_start, instance_end, os_alarm_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        arrayOf<Any>(localId, preAlarmTimeMs, firstSlot.startTimeMs, firstSlot.endTimeMs, preAlarmId, now)
                    )
                    setAlarm(context, preAlarmId, preAlarmTimeMs, convexId, title, recurrenceJson, firstSlot.endTimeMs, true, offset)
                    preAlarmsToSave.add(mapOf("offset" to offset, "fireAtMs" to preAlarmTimeMs, "alarmId" to preAlarmId))
                    Log.d(TAG, "🔔 Scheduled Pre-Alarm: $offset mins prior at ${formatTime(preAlarmTimeMs)}")
                }
            }
            
            // 4. Update Boot Storage
            saveToBootStorage(context, convexId, title, recurrenceJson, firstSlot.startTimeMs, firstSlot.endTimeMs, preAlarmsToSave)

            Log.d(TAG, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            Log.d(TAG, "📋 Scheduled: '$title' (1st of $count)")
            Log.d(TAG, "📋 Fire at: ${formatTime(firstSlot.startTimeMs)}")
            Log.d(TAG, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            return mapOf(
                "success" to true,
                "taskTitle" to title,
                "nextAlarmMs" to firstSlot.startTimeMs,
                "nextAlarmReadable" to formatTime(firstSlot.startTimeMs),
                "alarmId" to alarmId
            )
        } finally {
            db.close()
        }
    }

    /**
     * Cancel all alarms for a task.
     */
    fun cancelAlarm(context: Context, convexId: String): Map<String, Any?> {
        Log.d(TAG, "🚫 cancelAlarm() called for convexId=$convexId")
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "❌ DB not found for cancel!")
            return mapOf("success" to false, "error" to "DB not found")
        }

        val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)

        try {
            val cursor = db.rawQuery(
                "SELECT id FROM local_tasks WHERE convex_id = ?",
                arrayOf(convexId)
            )

            if (!cursor.moveToFirst()) {
                cursor.close()
                return mapOf("success" to false, "error" to "Task not found: $convexId")
            }

            val localId = cursor.getString(0)
            cursor.close()

            cancelAlarmForTask(context, db, localId, convexId)

            // Remove from device-protected storage
            removeFromBootStorage(context, convexId)

            Log.d(TAG, "🚫 Cancelled all alarms for: $convexId")
            return mapOf("success" to true, "cancelled" to convexId)
        } finally {
            db.close()
        }
    }

    /**
     * Chain the next alarm after the current one fires.
     * Called by AlarmActivity when user dismisses.
     */
    fun chainNextAlarm(context: Context, convexId: String, recurrenceJson: String, currentEndTimeMs: Long) {
        Log.d(TAG, "═══════════════════════════════════════════════")
        Log.d(TAG, "🔗 chainNextAlarm() called")
        Log.d(TAG, "🔗 convexId=$convexId")
        Log.d(TAG, "🔗 currentEndTimeMs=$currentEndTimeMs (${formatTime(currentEndTimeMs)})")
        Log.d(TAG, "🔗 Current time: ${formatTime(System.currentTimeMillis())}")

        val recurrence = JSONObject(recurrenceJson)
        val recType = recurrence.optString("type", "unknown")
        Log.d(TAG, "🔗 Recurrence type: $recType")

        if (recType == "once") {
            Log.d(TAG, "🔚 One-time task. Chain ends. Removing from boot storage.")
            removeFromBootStorage(context, convexId)
            return
        }

        val nextSlot = findNextTimeSlot(recurrence, currentEndTimeMs)
        if (nextSlot == null) {
            Log.d(TAG, "🔚 No more time slots found after ${formatTime(currentEndTimeMs)}. Chain ends.")
            return
        }
        Log.d(TAG, "🔗 Next slot: ${formatTime(nextSlot.startTimeMs)} → ${formatTime(nextSlot.endTimeMs)} (day=${nextSlot.dayOfWeek})")

        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "❌ DB not found during chain! Alarm won't be persisted to DB.")
            return
        }
        val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)

        try {
            val taskCursor = db.rawQuery(
                "SELECT id, title FROM local_tasks WHERE convex_id = ?",
                arrayOf(convexId)
            )

            if (!taskCursor.moveToFirst()) {
                taskCursor.close()
                Log.e(TAG, "❌ Task not found in local_tasks for convexId=$convexId during chain!")
                return
            }

            val localId = taskCursor.getString(0)
            val title = taskCursor.getString(1)
            taskCursor.close()
            Log.d(TAG, "🔗 Found task: localId=$localId, title='$title'")

            // 1. Mark the current instance as dismissed
            db.execSQL(
                "UPDATE scheduled_alarms SET dismissed = 1 WHERE task_id = ? AND instance_end = ?",
                arrayOf(localId, currentEndTimeMs)
            )

            val now = System.currentTimeMillis()
            var nextSlot: TimeSlotResult? = null

            // 2. Check for pre-calculated instances in DB
            val nextDbCursor = db.rawQuery(
                "SELECT instance_start, instance_end FROM scheduled_alarms WHERE task_id = ? AND dismissed = 0 AND fire_at = instance_start ORDER BY fire_at ASC LIMIT 1",
                arrayOf(localId)
            )

            if (nextDbCursor.moveToFirst()) {
                val start = nextDbCursor.getLong(0)
                val end = nextDbCursor.getLong(1)
                nextSlot = TimeSlotResult(start, end, 0)
                Log.d(TAG, "🔗 Found next pre-calculated instance in DB: ${formatTime(start)}")
            }
            nextDbCursor.close()

            // 3. If no pre-calculated instance, check if it's an infinite task
            if (nextSlot == null) {
                val endsObj = recurrence.optJSONObject("ends")
                val isInfinite = endsObj?.optString("type") != "after"

                if (isInfinite) {
                    val calculated = findNextTimeSlot(recurrence, currentEndTimeMs)
                    if (calculated != null) {
                        nextSlot = calculated
                        Log.d(TAG, "🔗 Infinite task: Calculated next slot: ${formatTime(nextSlot.startTimeMs)}")
                        
                        // Persist this new instance
                        val alarmId = (convexId.hashCode() and 0x7FFFFFFF)
                        db.execSQL(
                            """INSERT INTO scheduled_alarms (task_id, fire_at, instance_start, instance_end, os_alarm_id, created_at)
                               VALUES (?, ?, ?, ?, ?, ?)""",
                            arrayOf<Any>(localId, nextSlot.startTimeMs, nextSlot.startTimeMs, nextSlot.endTimeMs, alarmId, now)
                        )
                    }
                }
            }

            if (nextSlot == null) {
                Log.d(TAG, "🔚 No more time slots for '$title'. Chain ends.")
                removeFromBootStorage(context, convexId)
                return
            }

            // 4. Set the OS alarm for the next slot
            val alarmId = (convexId.hashCode() and 0x7FFFFFFF)
            setAlarm(context, alarmId, nextSlot.startTimeMs, convexId, title, recurrenceJson, nextSlot.endTimeMs)

            // 5. Pre-Alarm Logic (Dynamic for the next slot)
            val preAlarmsToSave = mutableListOf<Map<String, Any>>()
            for (offset in 15 downTo 1 step 2) {
                val preAlarmTimeMs = nextSlot.startTimeMs - (offset * 60 * 1000L)
                if (preAlarmTimeMs <= now) continue

                val minTime = preAlarmTimeMs - 5 * 60 * 1000L
                val maxTime = preAlarmTimeMs + 5 * 60 * 1000L
                val conflictCursor = db.rawQuery(
                    "SELECT COUNT(*) FROM scheduled_alarms WHERE task_id != ? AND instance_end >= ? AND instance_start <= ?",
                    arrayOf(localId, minTime.toString(), maxTime.toString())
                )
                var hasConflict = false
                if (conflictCursor.moveToFirst()) {
                    hasConflict = conflictCursor.getInt(0) > 0
                }
                conflictCursor.close()

                if (!hasConflict) {
                    val preAlarmId = ("${convexId}_pre_${offset}").hashCode() and 0x7FFFFFFF
                    db.execSQL(
                        "INSERT INTO scheduled_alarms (task_id, fire_at, instance_start, instance_end, os_alarm_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        arrayOf<Any>(localId, preAlarmTimeMs, nextSlot.startTimeMs, nextSlot.endTimeMs, preAlarmId, now)
                    )
                    setAlarm(context, preAlarmId, preAlarmTimeMs, convexId, title, recurrenceJson, nextSlot.endTimeMs, true, offset)
                    preAlarmsToSave.add(mapOf("offset" to offset, "fireAtMs" to preAlarmTimeMs, "alarmId" to preAlarmId))
                }
            }

            // Update Boot Storage
            saveToBootStorage(context, convexId, title, recurrenceJson, nextSlot.startTimeMs, nextSlot.endTimeMs, preAlarmsToSave)

            Log.d(TAG, "✅ Chained: '$title' → ${formatTime(nextSlot.startTimeMs)}")
            Log.d(TAG, "═══════════════════════════════════════════════")
        } catch (e: Exception) {
            Log.e(TAG, "❌ chainNextAlarm error: ${e.message}")
            Log.e(TAG, "❌ Stack trace: ${e.stackTraceToString()}")
        } finally {
            db.close()
        }
    }

    /**
     * Re-schedule ALL alarms from DB. Called by BootReceiver after phone restart.
     */
    fun rescheduleAllFromDb(context: Context) {
        val dbFile = getDbFile(context) ?: return
        val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)

        try {
            val cursor = db.rawQuery(
                "SELECT convex_id FROM local_tasks", null
            )

            val convexIds = mutableListOf<String>()
            while (cursor.moveToNext()) {
                convexIds.add(cursor.getString(0))
            }
            cursor.close()
            db.close()

            Log.d(TAG, "🔄 Boot: Re-scheduling ${convexIds.size} tasks")

            for (cid in convexIds) {
                try {
                    scheduleAlarm(context, cid)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to reschedule $cid: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "rescheduleAllFromDb error: ${e.message}")
            db.close()
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // AlarmManager Helpers
    // ═════════════════════════════════════════════════════════════════════

    private fun setAlarm(
        context: Context,
        alarmId: Int,
        fireAtMs: Long,
        convexId: String,
        title: String,
        recurrenceJson: String,
        endTimeMs: Long,
        isPreAlarm: Boolean = false,
        preAlarmOffset: Int = 0
    ) {
        Log.d(TAG, "⏰ setAlarm() → alarmId=$alarmId, fireAt=${formatTime(fireAtMs)}, title='$title', isPre=$isPreAlarm")

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("convex_id", convexId)
            putExtra("title", title)
            putExtra("recurrence_json", recurrenceJson)
            putExtra("alarm_id", alarmId)
            putExtra("end_time_ms", endTimeMs)
            putExtra("is_pre_alarm", isPreAlarm)
            putExtra("pre_alarm_offset", preAlarmOffset)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        Log.d(TAG, "⏰ PendingIntent created: $pendingIntent")

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val canSchedule = alarmManager.canScheduleExactAlarms()
            Log.d(TAG, "⏰ canScheduleExactAlarms: $canSchedule (API ${Build.VERSION.SDK_INT})")
            if (canSchedule) {
                alarmManager.setAlarmClock(
                    AlarmManager.AlarmClockInfo(fireAtMs, pendingIntent),
                    pendingIntent
                )
                Log.d(TAG, "✅ Alarm set via setAlarmClock() at ${formatTime(fireAtMs)}")
            } else {
                Log.w(TAG, "⚠️ Cannot schedule exact alarms! Using setAndAllowWhileIdle fallback.")
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, pendingIntent)
                Log.d(TAG, "⚠️ Alarm set via setAndAllowWhileIdle() at ${formatTime(fireAtMs)}")
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, pendingIntent)
            Log.d(TAG, "✅ Alarm set via setExactAndAllowWhileIdle() at ${formatTime(fireAtMs)} (API ${Build.VERSION.SDK_INT})")
        }
    }

    private fun cancelAlarmForTask(context: Context, db: SQLiteDatabase, localId: String, convexId: String) {
        Log.d(TAG, "🚫 cancelAlarmForTask() → localId=$localId, convexId=$convexId")

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)

        // Cancel Main Alarm
        val mainAlarmId = (convexId.hashCode() and 0x7FFFFFFF)
        val mainPendingIntent = PendingIntent.getBroadcast(
            context, mainAlarmId, intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (mainPendingIntent != null) {
            alarmManager.cancel(mainPendingIntent)
            mainPendingIntent.cancel()
            Log.d(TAG, "🚫 Cancelled existing Main PendingIntent for alarmId=$mainAlarmId")
        }

        // Cancel Pre-Alarms
        for (offset in 1..15 step 2) {
            val preAlarmId = ("${convexId}_pre_${offset}").hashCode() and 0x7FFFFFFF
            val prePendingIntent = PendingIntent.getBroadcast(
                context, preAlarmId, intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (prePendingIntent != null) {
                alarmManager.cancel(prePendingIntent)
                prePendingIntent.cancel()
            }
        }

        // Remove from DB (will remove both main and pre-alarms since they share localId)
        db.execSQL("DELETE FROM scheduled_alarms WHERE task_id = ?", arrayOf<Any>(localId))
        Log.d(TAG, "🚫 Deleted scheduled_alarms rows for task_id=$localId")
    }

    // ═════════════════════════════════════════════════════════════════════
    // Time Slot Calculator (same logic as backend scheduler.ts)
    // ═════════════════════════════════════════════════════════════════════

    data class TimeSlotResult(
        val startTimeMs: Long,
        val endTimeMs: Long,
        val dayOfWeek: Int
    )

    fun findNextTimeSlot(recurrence: JSONObject, afterMs: Long): TimeSlotResult? {
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

        val cal = Calendar.getInstance()
        cal.timeInMillis = afterMs

        val refDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1

        val todayCal = Calendar.getInstance()
        todayCal.timeInMillis = afterMs
        todayCal.set(Calendar.HOUR_OF_DAY, 0)
        todayCal.set(Calendar.MINUTE, 0)
        todayCal.set(Calendar.SECOND, 0)
        todayCal.set(Calendar.MILLISECOND, 0)
        val refDayStartMs = todayCal.timeInMillis

        for (dayOffset in 0..7) {
            val checkDayOfWeek = (refDayOfWeek + dayOffset) % 7
            if (!daysToCheck.contains(checkDayOfWeek)) continue

            val checkDayStartMs = refDayStartMs + dayOffset * 86400000L

            for ((startSecs, endSecs) in windows) {
                val windowStartMs = checkDayStartMs + startSecs * 1000L

                // Skip windows that start before our reference time
                if (windowStartMs < afterMs) continue

                val windowEndMs = checkDayStartMs + endSecs * 1000L

                return TimeSlotResult(
                    startTimeMs = windowStartMs,
                    endTimeMs = windowEndMs,
                    dayOfWeek = checkDayOfWeek
                )
            }
        }

        return null
    }

    // ═════════════════════════════════════════════════════════════════════
    // DB / Formatting Helpers
    // ═════════════════════════════════════════════════════════════════════

    fun getDbFile(context: Context): File? {
        val expoPath = File(context.filesDir, "SQLite/commit.db")
        if (expoPath.exists()) return expoPath
        val standardPath = context.getDatabasePath("commit.db")
        if (standardPath.exists()) return standardPath
        return null
    }

    fun formatTime(ms: Long): String {
        val cal = Calendar.getInstance()
        cal.timeInMillis = ms
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", cal)
    }

    // ═════════════════════════════════════════════════════════════════════
    // Device-Protected Storage (accessible before unlock, like stock alarm)
    // ═════════════════════════════════════════════════════════════════════

    private const val BOOT_PREFS = "commit_alarm_boot_data"
    private const val KEY_ALARMS = "pending_alarms"

    private fun getBootPrefs(context: Context): SharedPreferences {
        val deviceContext = context.createDeviceProtectedStorageContext()
        return deviceContext.getSharedPreferences(BOOT_PREFS, Context.MODE_PRIVATE)
    }

    /**
     * Save alarm data to device-protected storage.
     * This storage is accessible immediately after boot, even before the user unlocks.
     */
    private fun saveToBootStorage(
        context: Context,
        convexId: String,
        title: String,
        recurrenceJson: String,
        fireAtMs: Long,
        endTimeMs: Long,
        preAlarms: List<Map<String, Any>> = emptyList()
    ) {
        try {
            val prefs = getBootPrefs(context)
            val alarmsJson = prefs.getString(KEY_ALARMS, "{}")
            val alarms = JSONObject(alarmsJson)

            val preAlarmsArray = JSONArray()
            for (pa in preAlarms) {
                val pObj = JSONObject()
                pObj.put("offset", pa["offset"])
                pObj.put("fireAtMs", pa["fireAtMs"])
                pObj.put("alarmId", pa["alarmId"])
                preAlarmsArray.put(pObj)
            }

            val entry = JSONObject().apply {
                put("convexId", convexId)
                put("title", title)
                put("recurrenceJson", recurrenceJson)
                put("fireAtMs", fireAtMs)
                put("endTimeMs", endTimeMs)
                put("preAlarms", preAlarmsArray)
            }
            alarms.put(convexId, entry)

            prefs.edit().putString(KEY_ALARMS, alarms.toString()).apply()
            Log.d(TAG, "💾 Saved to boot storage: '$title' at ${formatTime(fireAtMs)}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save to boot storage: ${e.message}")
        }
    }

    /**
     * Remove alarm data from device-protected storage.
     */
    private fun removeFromBootStorage(context: Context, convexId: String) {
        try {
            val prefs = getBootPrefs(context)
            val alarmsJson = prefs.getString(KEY_ALARMS, "{}")
            val alarms = JSONObject(alarmsJson)
            alarms.remove(convexId)
            prefs.edit().putString(KEY_ALARMS, alarms.toString()).apply()
            Log.d(TAG, "🗑️ Removed from boot storage: $convexId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to remove from boot storage: ${e.message}")
        }
    }

    /**
     * Re-schedule all alarms from device-protected storage.
     * Called by BootReceiver — works even before the phone is unlocked.
     */
    fun rescheduleAllFromBootStorage(context: Context) {
        try {
            val prefs = getBootPrefs(context)
            val alarmsJson = prefs.getString(KEY_ALARMS, "{}")
            val alarms = JSONObject(alarmsJson)

            if (alarms.length() == 0) {
                Log.d(TAG, "📭 No alarms in boot storage to re-schedule")
                return
            }

            val now = System.currentTimeMillis()
            Log.d(TAG, "🔄 Re-scheduling ${alarms.length()} alarms from boot storage")
            Log.d(TAG, "🔄 Current time: ${formatTime(now)}")

            val keys = alarms.keys()
            while (keys.hasNext()) {
                val convexId = keys.next()
                try {
                    val entry = alarms.getJSONObject(convexId)
                    val title = entry.getString("title")
                    val recurrenceJson = entry.getString("recurrenceJson")
                    val savedFireAtMs = entry.optLong("fireAtMs", 0L)
                    val savedEndTimeMs = entry.getLong("endTimeMs")
                    
                    val alarmId = (convexId.hashCode() and 0x7FFFFFFF)
                    val preAlarmsArray = entry.optJSONArray("preAlarms") ?: JSONArray()

                    // If saved fire time is still in the future, reuse it directly
                    // This prevents BOOT_COMPLETED from overriding LOCKED_BOOT's alarm
                    if (savedFireAtMs > now) {
                        Log.d(TAG, "⏰ '$title': saved fire time ${formatTime(savedFireAtMs)} is still in the future (${(savedFireAtMs - now) / 1000}s away). Reusing it.")
                        setAlarm(context, alarmId, savedFireAtMs, convexId, title, recurrenceJson, savedEndTimeMs)
                        Log.d(TAG, "✅ Re-scheduled '$title' → ${formatTime(savedFireAtMs)} (reused saved time)")
                        
                        // Reuse future pre-alarms
                        for (i in 0 until preAlarmsArray.length()) {
                            val pObj = preAlarmsArray.getJSONObject(i)
                            val offset = pObj.getInt("offset")
                            val pFireAtMs = pObj.getLong("fireAtMs")
                            val pAlarmId = pObj.getInt("alarmId")
                            if (pFireAtMs > now) {
                                setAlarm(context, pAlarmId, pFireAtMs, convexId, title, recurrenceJson, savedEndTimeMs, true, offset)
                            }
                        }

                    } else {
                        // Saved time has passed — check how recently
                        val missedByMs = now - savedFireAtMs
                        val missedByMin = missedByMs / 60_000

                        if (missedByMs < 10 * 60 * 1000) {
                            // Alarm was missed RECENTLY (within 10 minutes) — likely during boot
                            // Fire it immediately (30 seconds from now to let system stabilize)
                            val fireNow = now + 30_000
                            Log.d(TAG, "🚨 '$title': saved fire time ${formatTime(savedFireAtMs)} was missed ${missedByMin}min ago (during boot). FIRING NOW in 30s!")
                            setAlarm(context, alarmId, fireNow, convexId, title, recurrenceJson, savedEndTimeMs)

                            // Update boot storage with the immediate fire time
                            val updatedEntry = JSONObject().apply {
                                put("convexId", convexId)
                                put("title", title)
                                put("recurrenceJson", recurrenceJson)
                                put("fireAtMs", fireNow)
                                put("endTimeMs", savedEndTimeMs)
                                put("preAlarms", preAlarmsArray) // maintain them, some might still be future
                            }
                            alarms.put(convexId, updatedEntry)
                            
                            // Re-schedule future prealarms (though unlikely since main is missed, some might exist theoretically)
                            for (i in 0 until preAlarmsArray.length()) {
                                val pObj = preAlarmsArray.getJSONObject(i)
                                val offset = pObj.getInt("offset")
                                val pFireAtMs = pObj.getLong("fireAtMs")
                                val pAlarmId = pObj.getInt("alarmId")
                                if (pFireAtMs > now) {
                                    setAlarm(context, pAlarmId, pFireAtMs, convexId, title, recurrenceJson, savedEndTimeMs, true, offset)
                                }
                            }

                            Log.d(TAG, "✅ Re-scheduled '$title' → ${formatTime(fireNow)} (immediate — missed during boot)")

                        } else {
                            // Alarm is truly old (>10 min) — recalculate the next slot
                            Log.d(TAG, "⏰ '$title': saved fire time ${formatTime(savedFireAtMs)} has PASSED (${missedByMin}min ago). Recalculating next slot...")
                            val recurrence = JSONObject(recurrenceJson)
                            val nextSlot = findNextTimeSlot(recurrence, now)

                            if (nextSlot != null) {
                                setAlarm(context, alarmId, nextSlot.startTimeMs, convexId, title, recurrenceJson, nextSlot.endTimeMs)

                                // Create new prealarms array
                                val newPreAlarms = JSONArray()
                                for (i in 0 until preAlarmsArray.length()) {
                                    val pObj = preAlarmsArray.getJSONObject(i)
                                    val offset = pObj.getInt("offset")
                                    val pAlarmId = pObj.getInt("alarmId")
                                    val newPFireAtMs = nextSlot.startTimeMs - (offset * 60 * 1000L)
                                    if (newPFireAtMs > now) {
                                        setAlarm(context, pAlarmId, newPFireAtMs, convexId, title, recurrenceJson, nextSlot.endTimeMs, true, offset)
                                        val newPObj = JSONObject()
                                        newPObj.put("offset", offset)
                                        newPObj.put("fireAtMs", newPFireAtMs)
                                        newPObj.put("alarmId", pAlarmId)
                                        newPreAlarms.put(newPObj)
                                    }
                                }

                                // Update boot storage with new fire time
                                val updatedEntry = JSONObject().apply {
                                    put("convexId", convexId)
                                    put("title", title)
                                    put("recurrenceJson", recurrenceJson)
                                    put("fireAtMs", nextSlot.startTimeMs)
                                    put("endTimeMs", nextSlot.endTimeMs)
                                    put("preAlarms", newPreAlarms)
                                }
                                alarms.put(convexId, updatedEntry)

                                Log.d(TAG, "✅ Re-scheduled '$title' → ${formatTime(nextSlot.startTimeMs)} (recalculated)")
                            } else {
                                Log.d(TAG, "⏭️ No upcoming slot for '$title', skipping")
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to re-schedule $convexId: ${e.message}")
                }
            }

            // Save updated fire times back
            prefs.edit().putString(KEY_ALARMS, alarms.toString()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "rescheduleAllFromBootStorage error: ${e.message}")
        }
    }
}
