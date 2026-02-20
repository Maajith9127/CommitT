import re

file_path = "android/src/main/java/expo/modules/scheduler/AlarmScheduler.kt"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update setAlarm definition and setAlarmClock usages
repl1_old = """    private fun setAlarm(
        context: Context,
        alarmId: Int,
        fireAtMs: Long,
        convexId: String,
        title: String,
        recurrenceJson: String,
        endTimeMs: Long
    ) {"""

repl1_new = """    private fun setAlarm(
        context: Context,
        alarmId: Int,
        fireAtMs: Long,
        convexId: String,
        title: String,
        recurrenceJson: String,
        endTimeMs: Long,
        isPreAlarm: Boolean = false,
        preAlarmOffset: Int = 0
    ) {"""
content = content.replace(repl1_old, repl1_new)

repl1b_old = """            putExtra("convex_id", convexId)
            putExtra("title", title)
            putExtra("recurrence_json", recurrenceJson)
            putExtra("alarm_id", alarmId)
            putExtra("end_time_ms", endTimeMs)
        }"""
        
repl1b_new = """            putExtra("convex_id", convexId)
            putExtra("title", title)
            putExtra("recurrence_json", recurrenceJson)
            putExtra("alarm_id", alarmId)
            putExtra("end_time_ms", endTimeMs)
            putExtra("is_pre_alarm", isPreAlarm)
            putExtra("pre_alarm_offset", preAlarmOffset)
        }"""
content = content.replace(repl1b_old, repl1b_new)


# 2. Update cancelAlarmForTask
repl2_old = """    private fun cancelAlarmForTask(context: Context, db: SQLiteDatabase, localId: String, convexId: String) {
        Log.d(TAG, "🚫 cancelAlarmForTask() → localId=$localId, convexId=$convexId")

        // Cancel the PendingIntent
        val alarmId = (convexId.hashCode() and 0x7FFFFFFF)
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context, alarmId, intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            Log.d(TAG, "🚫 Cancelled existing PendingIntent for alarmId=$alarmId")
        } else {
            Log.d(TAG, "🚫 No existing PendingIntent found for alarmId=$alarmId (already cancelled or never set)")
        }

        // Remove from DB
        db.execSQL("DELETE FROM scheduled_alarms WHERE task_id = ?", arrayOf<Any>(localId))
        Log.d(TAG, "🚫 Deleted scheduled_alarms rows for task_id=$localId")
    }"""

repl2_new = """    private fun cancelAlarmForTask(context: Context, db: SQLiteDatabase, localId: String, convexId: String) {
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
    }"""
content = content.replace(repl2_old, repl2_new)


# 3. Update scheduleAlarm
repl3_old = """            // Persist to device-protected storage (accessible before unlock)
            saveToBootStorage(context, convexId, title, recurrenceJson, nextSlot.startTimeMs, nextSlot.endTimeMs)

            Log.d(TAG, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")"""

repl3_new = """            // ==========================================
            // Pre-Alarm Logic
            // ==========================================
            val preAlarmsToSave = mutableListOf<Map<String, Any>>()
            for (offset in 15 downTo 1 step 2) {
                val preAlarmTimeMs = nextSlot.startTimeMs - (offset * 60 * 1000L)
                if (preAlarmTimeMs <= now) continue

                // Check for conflicts: Any OTHER task overlapping with [preAlarmTime - 5m, preAlarmTime + 5m]?
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
                    Log.d(TAG, "🔔 Scheduled Pre-Alarm: $offset mins prior at ${formatTime(preAlarmTimeMs)}")
                } else {
                    Log.d(TAG, "⏭️ Pre-Alarm skipped due to adjacent/overlapping task conflict ($offset mins prior)")
                }
            }
            // ==========================================

            // Persist to device-protected storage (accessible before unlock)
            saveToBootStorage(context, convexId, title, recurrenceJson, nextSlot.startTimeMs, nextSlot.endTimeMs, preAlarmsToSave)

            Log.d(TAG, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")"""
content = content.replace(repl3_old, repl3_new)


# 4. Update chainNextAlarm
repl4_old = """            // Update device-protected storage
            saveToBootStorage(context, convexId, title, recurrenceJson, nextSlot.startTimeMs, nextSlot.endTimeMs)

            Log.d(TAG, "✅ Chained: '$title' →"""

repl4_new = """            // ==========================================
            // Pre-Alarm Logic (Chain)
            // ==========================================
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

            // Update device-protected storage
            saveToBootStorage(context, convexId, title, recurrenceJson, nextSlot.startTimeMs, nextSlot.endTimeMs, preAlarmsToSave)

            Log.d(TAG, "✅ Chained: '$title' →"""
content = content.replace(repl4_old, repl4_new)


# 5. Update saveToBootStorage argument signature
repl5_old = """    private fun saveToBootStorage(
        context: Context,
        convexId: String,
        title: String,
        recurrenceJson: String,
        fireAtMs: Long,
        endTimeMs: Long
    ) {"""

repl5_new = """    private fun saveToBootStorage(
        context: Context,
        convexId: String,
        title: String,
        recurrenceJson: String,
        fireAtMs: Long,
        endTimeMs: Long,
        preAlarms: List<Map<String, Any>> = emptyList()
    ) {"""
content = content.replace(repl5_old, repl5_new)


# 6. Update saveToBootStorage internal logic
repl6_old = """            val entry = JSONObject().apply {
                put("convexId", convexId)
                put("title", title)
                put("recurrenceJson", recurrenceJson)
                put("fireAtMs", fireAtMs)
                put("endTimeMs", endTimeMs)
            }"""

repl6_new = """            val preAlarmsArray = JSONArray()
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
            }"""
content = content.replace(repl6_old, repl6_new)

# 7. Update rescheduleAllFromBootStorage helper functions and usage
# We will do a generic replace.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("PATCH 1 DONE")
