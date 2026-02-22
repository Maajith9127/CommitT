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

    fun scheduleAlarm(context: Context, convexId: String) {
        Log.d(TAG, "scheduleAlarm: $convexId")
    }

    fun cancelAlarm(context: Context, convexId: String) {
        Log.d(TAG, "cancelAlarm: $convexId")
    }

    fun scheduleNextAlarm(context: Context) {
        Log.d(TAG, "═══════════════════════════════════════════════")
        Log.d(TAG, "📅 scheduleNextAlarm() called")
        
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "❌ DB not found!")
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
                   ORDER BY start_time ASC LIMIT 1""",
                arrayOf(now.toString())
            )

            if (cursor.moveToFirst()) {
                val instanceId = cursor.getString(0)
                val title = cursor.getString(1)
                val startTimeMs = cursor.getLong(2)
                
                Log.d(TAG, "🎯 NEXT UPCOMING TASK FOUND:")
                Log.d(TAG, "   ID: $instanceId")
                Log.d(TAG, "   Title: $title")
                Log.d(TAG, "   Start Time: ${formatTime(startTimeMs)} ($startTimeMs)")

                // Schedule it with the OS so it persists via AlarmManager
                setOSAlarm(context, instanceId, title, startTimeMs, now)
            } else {
                Log.d(TAG, "📭 No upcoming tasks found after current time.")
            }
            cursor.close()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error reading database: ${e.message}")
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

    fun rescheduleAllFromBootStorage(context: Context) {
        Log.d(TAG, "rescheduleAllFromBootStorage")
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
