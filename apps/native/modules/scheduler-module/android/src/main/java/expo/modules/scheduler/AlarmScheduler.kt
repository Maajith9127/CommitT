package expo.modules.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.util.Log
import java.io.File
import java.util.Calendar

object AlarmScheduler {
    private const val TAG = "AlarmScheduler"
    private const val PREFS_NAME = "UpcomingAlarmsCache"
    private const val KEY_ALARMS_LIST = "AlarmsList"

    fun scheduleNextAlarm(context: Context) {
        Log.d(TAG, "═══════════════════════════════════════════════")
        Log.d(TAG, "📅 scheduleNextAlarm() called")
        
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "❌ DB not found! Falling back to Sticky Note...")
            scheduleFromStickyNote(context)
            Log.d(TAG, "═══════════════════════════════════════════════")
            return
        }

        var db: SQLiteDatabase? = null
        try {
            db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            val now = System.currentTimeMillis()
            
            Log.d(TAG, "📅 Looking for next task instance after: ${formatTime(now)}")

            val cursor = db.rawQuery(
                """SELECT id, title, start_time 
                   FROM task_instances 
                   WHERE start_time >= ? 
                   ORDER BY start_time ASC LIMIT 20""", // Grab the next 20 to buffer
                arrayOf(now.toString())
            )

            if (cursor.moveToFirst()) {
                val instanceId = cursor.getString(0)
                val title = cursor.getString(1)
                val startTimeMs = cursor.getLong(2)
                
                Log.d(TAG, "🎯 NEXT UPCOMING TASK FOUND IN DB:")
                Log.d(TAG, "   ID: $instanceId")
                Log.d(TAG, "   Title: $title")
                Log.d(TAG, "   Start Time: ${formatTime(startTimeMs)} ($startTimeMs)")

                // Schedule it with the OS so it persists via AlarmManager
                setOSAlarm(context, instanceId, title, startTimeMs, now)
                
                // --- SYNC TO DEVICE PROTECTED STORAGE (THE STICKY NOTE) ---
                syncToStickyNote(context, cursor)

            } else {
                Log.d(TAG, "📭 No upcoming tasks found after current time.")
                clearStickyNote(context)
            }
            cursor.close()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error reading database: ${e.message}")
            Log.d(TAG, "🔄 Attempting to read from Device Protected Sticky Note...")
            scheduleFromStickyNote(context)
        } finally {
            db?.close()
        }
        Log.d(TAG, "═══════════════════════════════════════════════")
    }

    fun markInstanceProceeded(context: Context, instanceId: String) {
        Log.d(TAG, "═══════════════════════════════════════════════")
        Log.d(TAG, "✅ markInstanceProceeded() called for instance_id: $instanceId")
        
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "❌ DB not found!")
            return
        }

        var db: SQLiteDatabase? = null
        try {
            db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
            val query = "UPDATE task_instances SET status = 'proceeded' WHERE id = ?"
            db.execSQL(query, arrayOf(instanceId))
            Log.d(TAG, "✅ Successfully marked instance '$instanceId' as proceeded in DB.")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to update instance status: ${e.message}")
        } finally {
            db?.close()
        }
        Log.d(TAG, "═══════════════════════════════════════════════")
    }

    // --- STICKY NOTE (DEVICE PROTECTED STORAGE) LOGIC --- //

    private fun getSafePrefs(context: Context): android.content.SharedPreferences? {
        val deviceContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.createDeviceProtectedStorageContext()
        } else {
            context
        }
        return deviceContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun syncToStickyNote(context: Context, cursor: android.database.Cursor) {
        try {
            val list = mutableListOf<String>()
            
            // Cursor is already at the first item from the if(cursor.moveToFirst()) check
            do {
                val id = cursor.getString(0)
                val title = cursor.getString(1)
                val time = cursor.getLong(2)
                // Basic CSV format: id|title|time
                list.add("$id|$title|$time")
            } while (cursor.moveToNext())

            val serialized = list.joinToString(";;")
            getSafePrefs(context)?.edit()?.putString(KEY_ALARMS_LIST, serialized)?.apply()
            Log.d(TAG, "📝 Saved ${list.size} upcoming tasks to Device Protected Sticky Note.")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to save sticky note: ${e.message}")
        }
    }

    private fun clearStickyNote(context: Context) {
        getSafePrefs(context)?.edit()?.remove(KEY_ALARMS_LIST)?.apply()
    }

    private fun scheduleFromStickyNote(context: Context) {
        val serialized = getSafePrefs(context)?.getString(KEY_ALARMS_LIST, null)
        if (serialized.isNullOrEmpty()) {
            Log.d(TAG, "📭 Sticky Note is empty. No known offline alarms.")
            return
        }

        val now = System.currentTimeMillis()
        val alarms = serialized.split(";;")

        for (alarmStr in alarms) {
            val parts = alarmStr.split("|")
            if (parts.size == 3) {
                val id = parts[0]
                val title = parts[1]
                val timeMs = parts[2].toLongOrNull() ?: 0L

                // Find the first one that hasn't fired yet
                if (timeMs >= now) {
                    Log.d(TAG, "🎯 NEXT UPCOMING TASK FOUND IN STICKY NOTE:")
                    Log.d(TAG, "   ID: $id")
                    Log.d(TAG, "   Title: $title")
                    Log.d(TAG, "   Start Time: ${formatTime(timeMs)} ($timeMs)")
                    
                    setOSAlarm(context, id, title, timeMs, now)
                    return // Only schedule the immediate next one!
                }
            }
        }
        Log.d(TAG, "📭 All tasks in the Sticky Note are in the past. Nothing left offline.")
    }

    private fun setOSAlarm(
        context: Context,
        instanceId: String,
        title: String,
        fireAtMs: Long,
        nowMs: Long
    ) {
        Log.d(TAG, "⏰ Setting OS Alarm for: '$title' at ${formatTime(fireAtMs)}")
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("instance_id", instanceId)
            putExtra("title", title)
            putExtra("fire_at_ms", fireAtMs)
            putExtra("scheduled_at_now", nowMs)
        }
        
        Log.d(TAG, "⏰ Prepared AlarmReceiver intent extras.")

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            99999, // Static ID since we only want ONE next alarm pending at any time
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    Log.d(TAG, "⏰ Device allows Exact Alarms, using setAlarmClock...")
                    alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(fireAtMs, pendingIntent), pendingIntent)
                } else {
                    Log.w(TAG, "⚠️ Device blocked Exact Alarms, using setAndAllowWhileIdle...")
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, pendingIntent)
                }
            } else {
                Log.d(TAG, "⏰ API < 31, using setExactAndAllowWhileIdle...")
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, pendingIntent)
            }
            Log.d(TAG, "✅ AlarmManager successfully queued single trigger!")
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ SecurityException while setting alarm: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to set OS Alarm: ${e.message}")
        }
    }

    private fun getDbFile(context: Context): File? {
        // Since Expo SQLite puts things in a specific folder, let's build the path manually safely
        try {
            // First check standard storage
            val expoPath = File(context.filesDir, "SQLite/commit.db")
            if (expoPath.exists()) return expoPath

            val standardPath = context.getDatabasePath("commit.db")
            if (standardPath.exists()) return standardPath

            // If we are in LOCKED_BOOT_COMPLETED, standard storage might be unavailable.
            // Check Device Protected Storage Context
            val deviceContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                context.createDeviceProtectedStorageContext()
            } else {
                null
            }
            
            if (deviceContext != null) {
                val safeExpoPath = File(deviceContext.filesDir, "SQLite/commit.db")
                if (safeExpoPath.exists()) return safeExpoPath
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error accessing file paths (Storage locked?): ${e.message}")
        }
        
        // Final fallback: try to access the known Expo path directly
        val rawPath = File("/data/user/0/" + context.packageName + "/files/SQLite/commit.db")
        if (rawPath.exists()) return rawPath

        return null
    }

    private fun formatTime(ms: Long): String {
        val cal = Calendar.getInstance()
        cal.timeInMillis = ms
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", cal)
    }
}
