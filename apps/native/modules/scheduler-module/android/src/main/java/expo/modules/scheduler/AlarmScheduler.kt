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

/**
 * The core infrastructure orchestrator for all background execution scheduling.
 *
 * It manages direct database interactions securely and coordinates with the Android AlarmManager 
 * using an architecture designed for high availability and fail-over logic.
 *
 * Fail-over Architecture (The "Vault vs. Sticky Note" Pattern):
 * - Primary Storage (The "Vault"): 
 *   An SQLite Database operating under standard Credential Encrypted (CE) limits.
 *   This is exclusively accessible when the device is unlocked.
 * - Redundant Cache (The "Sticky Note"):
 *   Device Protected Encrypted (DE) Storage. This caches the immediate upcoming alerts,
 *   bridging the gap when a device restarts and remains in a locked state (Direct Boot mode),
 *   allowing the alarm to trigger even before the user opens the standard vault.
 */
object AlarmScheduler {
    private const val TAG = "AlarmScheduler"
    private const val CACHE_PREFS_NAME = "UpcomingAlarmsCache"
    private const val KEY_ALARMS_LIST = "AlarmsList"

    /**
     * Determines the optimal upcoming alarm trigger and officially registers it 
     * with the Android Operating System.
     *
     * This evaluates standard SQLite first. It falls back to the Device Encrypted cache
     * if the database is inaccessible due to encryption or missing files.
     *
     * @param context the application context initiating the scheduling sequence.
     */
    fun scheduleNextAlarm(context: Context) {
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.w(TAG, "Standard SQLite file inaccessible or evaluated empty. Delegating to DE Storage Cache.")
            scheduleFromStickyNote(context)
            return
        }

        var database: SQLiteDatabase? = null
        try {
            database = SQLiteDatabase.openDatabase(
                dbFile.absolutePath, 
                null, 
                SQLiteDatabase.OPEN_READONLY
            )
            val currentTimeMs = System.currentTimeMillis()
            
            val cursor = database.rawQuery(
                """SELECT id, title, start_time 
                   FROM task_instances 
                   WHERE start_time >= ? 
                   ORDER BY start_time ASC LIMIT 20""",
                arrayOf(currentTimeMs.toString())
            )

            if (cursor.moveToFirst()) {
                val instanceId = cursor.getString(0)
                val title = cursor.getString(1)
                val startTimeMs = cursor.getLong(2)

                Log.d(TAG, "Primary task defined from SQLite -> Identifier: $instanceId, Allocation: ${formatTimestamp(startTimeMs)}")
                
                // Assert the alarm to the system and synchronize the fallback storage
                setOSAlarm(context, instanceId, title, startTimeMs, currentTimeMs)
                syncToStickyNote(context, cursor)
            } else {
                Log.d(TAG, "Queue execution complete: Zero tasks scheduled for the future. Purging caching layer.")
                clearStickyNote(context)
            }
            cursor.close()
        } catch (exception: Exception) {
            Log.e(TAG, "SQLite read execution failure. Routing flow to fallback cache. Trace: ${exception.message}", exception)
            scheduleFromStickyNote(context)
        } finally {
            database?.close()
        }
    }

    /**
     * Mutates the database state of a given task instance, marking it as successfully evaluated
     * or practically concluded ('proceeded').
     *
     * @param context application context.
     * @param instanceId the UUID associated with the executed task.
     */
    fun markInstanceProceeded(context: Context, instanceId: String) {
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "Mutation halted. Database explicitly unlocatable for target identifier: $instanceId.")
            return
        }

        var database: SQLiteDatabase? = null
        try {
            database = SQLiteDatabase.openDatabase(
                dbFile.absolutePath, 
                null, 
                SQLiteDatabase.OPEN_READWRITE
            )
            val updateQuery = "UPDATE task_instances SET status = 'proceeded' WHERE id = ?"
            database.execSQL(updateQuery, arrayOf(instanceId))
            Log.d(TAG, "Mutation verified. Instance $instanceId permanently flagged as proceeded.")
        } catch (exception: Exception) {
            Log.e(TAG, "Mutation structural failure for instance $instanceId. Output: ${exception.message}", exception)
        } finally {
            database?.close()
        }
    }

    /* --- REDUNDANCY PROTOCOL: DEVICE PROTECTED STORAGE CACHE --- */

    /**
     * Secures a context instance inherently capable of bypassing standard Credential Encryption,
     * effectively allowing storage interaction even if the user has not unlocked the device post-reboot.
     */
    private fun getDeviceProtectedContext(context: Context): android.content.SharedPreferences? {
        val safeContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.createDeviceProtectedStorageContext()
        } else {
            context
        }
        return safeContext.getSharedPreferences(CACHE_PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Serializes an incoming SQLite cursor of upcoming alarms into the Device Protected preferences.
     * This provides the explicit fail-over data in case of unexpected shutdown or locked reboots.
     */
    private fun syncToStickyNote(context: Context, cursor: android.database.Cursor) {
        try {
            val synchronizationSet = mutableListOf<String>()
            do {
                val identifier = cursor.getString(0)
                val taskTitle = cursor.getString(1)
                val unixTimeMs = cursor.getLong(2)
                synchronizationSet.add("$identifier|$taskTitle|$unixTimeMs")
            } while (cursor.moveToNext())

            val payloadString = synchronizationSet.joinToString(";;")
            getDeviceProtectedContext(context)?.edit()?.putString(KEY_ALARMS_LIST, payloadString)?.apply()
            Log.d(TAG, "Cache configuration successfully pushed: Synced ${synchronizationSet.size} potential events.")
        } catch (exception: Exception) {
            Log.e(TAG, "Catastrophic caching failure during payload flush: ${exception.message}", exception)
        }
    }

    /**
     * Performs a complete deletion of the redundancy array.
     */
    private fun clearStickyNote(context: Context) {
        getDeviceProtectedContext(context)?.edit()?.remove(KEY_ALARMS_LIST)?.apply()
    }

    /**
     * Executes the fail-over reading algorithm. Evaluates the local serialized payload
     * and strictly schedules the first task chronologically identified in the future.
     */
    private fun scheduleFromStickyNote(context: Context) {
        val serializedPayload = getDeviceProtectedContext(context)?.getString(KEY_ALARMS_LIST, null)
        if (serializedPayload.isNullOrEmpty()) {
            Log.d(TAG, "Cache inspection resulted null. Halting local hardware alarm delegation.")
            return
        }

        val currentTimeMs = System.currentTimeMillis()
        val delimitedTasks = serializedPayload.split(";;")

        for (taskPayload in delimitedTasks) {
            val taskSegments = taskPayload.split("|")
            if (taskSegments.size == 3) {
                val identifier = taskSegments[0]
                val taskTitle = taskSegments[1]
                val timeMs = taskSegments[2].toLongOrNull() ?: 0L

                if (timeMs >= currentTimeMs) {
                    Log.d(TAG, "Fallback event structurally viable -> Identifier: $identifier, Allocation: ${formatTimestamp(timeMs)}")
                    setOSAlarm(context, identifier, taskTitle, timeMs, currentTimeMs)
                    return // Single event architecture explicitly requires returning
                }
            }
        }
        Log.d(TAG, "All identified fallback tasks exist in negative chronology. Delegation ceased.")
    }

    /* --- HARDWARE KERNEL REGISTRATION --- */

    /**
     * Submits a direct hardware request to the Android AlarmManager via a specific PendingIntent architecture.
     */
    private fun setOSAlarm(
        context: Context,
        instanceId: String,
        title: String,
        fireAtMs: Long,
        nowMs: Long
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val receiverIntent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("instance_id", instanceId)
            putExtra("title", title)
            putExtra("fire_at_ms", fireAtMs)
            putExtra("scheduled_at_now", nowMs)
        }

        val systemPendingIntent = PendingIntent.getBroadcast(
            context,
            99999, // Constant static ID forces singular instance overwrite (avoiding duplicate queues)
            receiverIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    val alarmClockInfo = AlarmManager.AlarmClockInfo(fireAtMs, systemPendingIntent)
                    alarmManager.setAlarmClock(alarmClockInfo, systemPendingIntent)
                    Log.d(TAG, "Registration achieved natively. Strategy: AlarmClock API")
                } else {
                    Log.w(TAG, "Kernel verification denied Exact Alarms permission. Downgrading exact execution.")
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, systemPendingIntent)
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, systemPendingIntent)
                Log.d(TAG, "Registration achieved natively. Strategy: Pre-S Exact API")
            }
        } catch (securityException: SecurityException) {
            Log.e(TAG, "Permission matrix rejection explicitly blocking execution: ${securityException.message}", securityException)
        } catch (generalException: Exception) {
            Log.e(TAG, "Systematic routing exception resolving hardware dispatch: ${generalException.message}", generalException)
        }
    }

    /**
     * Iteratively evaluates Android filesystem layouts to deduce the absolute path 
     * of the Expo SQLite database irrespective of Credential/Device encryption states.
     */
    private fun getDbFile(context: Context): File? {
        try {
            // Priority 1: Direct path resolving utilizing Expo's architectural layout
            val primaryFile = File(context.filesDir, "SQLite/commit.db")
            if (primaryFile.exists()) return primaryFile

            // Priority 2: Standard native Android implementation pathing
            val secondaryFile = context.getDatabasePath("commit.db")
            if (secondaryFile.exists()) return secondaryFile

            // Priority 3: Encrypted Direct Boot evaluation Context matching
            val encryptedContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                context.createDeviceProtectedStorageContext()
            } else null
            
            if (encryptedContext != null) {
                val isolatedFile = File(encryptedContext.filesDir, "SQLite/commit.db")
                if (isolatedFile.exists()) return isolatedFile
            }
        } catch (exception: Exception) {
            Log.e(TAG, "Filesystem violation encountered reading file architectures: ${exception.message}", exception)
        }
        
        // Priority 4: Fallback Raw Absolute Pathing
        val rawDirectoryFile = File("/data/user/0/" + context.packageName + "/files/SQLite/commit.db")
        if (rawDirectoryFile.exists()) return rawDirectoryFile

        return null
    }

    /**
     * Subroutine dedicated to formatting purely for human-readable architectural logs.
     */
    private fun formatTimestamp(timeMs: Long): String {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = timeMs
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", calendar)
    }
}
