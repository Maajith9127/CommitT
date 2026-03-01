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
 * AlarmScheduler (The Core Infrastructure Orchestrator)
 * 
 * Think of this file as the central "Brain" of the entire scheduling system.
 * It is solely responsible for reading exactly when alarms should go off, and then 
 * telling the Android Kernel *exactly* what to do.
 * 
 * KEY ARCHITECTURE: The "Vault" vs. The "Sticky Note"
 * 
 * 1. The "Vault": The main SQLite database. It holds thousands of tasks forever. 
 *    However, it utilizes strict Android Credential Encryption (CE), meaning if you 
 *    turn your phone off and on, this file is fully locked, encrypted, and completely 
 *    inaccessible *until* you enter your passcode.
 * 
 * 2. The "Sticky Note": Device Protected Storage (DE). When the phone reboots and is 
 *    sitting locked, we cannot read the database. Thus, every time we update an alarm, 
 *    we write the upcoming 20 alarms onto this unencrypted "Sticky Note". This allows 
 *    our alarms to successfully fire even before the user types in their PIN after a restart.
 */
object AlarmScheduler {
    private const val TAG = "AlarmScheduler"
    private const val CACHE_PREFS_NAME = "UpcomingAlarmsCache"
    private const val KEY_ALARMS_LIST = "AlarmsList"

    /**
     * scheduleNextAlarm()
     * 
     * The master function. It opens the database, grabs the upcoming tasks, figures out 
     * the mathematically most immediate next alarm (including pre-alarms), and demands 
     * Android to wake up the system at that specific millisecond.
     */
    fun scheduleNextAlarm(context: Context) {
        Log.i(TAG, "==== [MASTER SCHEDULING SEQUENCE INITIATED] ====")
        
        // Step 1: Attempt to securely locate the Main SQLite database.
        val dbFile = getDbFile(context)
        
        // If the database absolutely cannot be found, it usually means the phone was just rebooted
        // and is locked with a password (FBE encryption). So, we switch to reading from our "Sticky Note".
        if (dbFile == null) {
            Log.w(TAG, "[STORAGE FAULT] Standard SQLite file inaccessible (Device Locked). Diverting flow to Fallback Cache.")
            scheduleFromStickyNote(context) // Engage the Sticky Note logic
            Log.i(TAG, "==== [MASTER SCHEDULING SEQUENCE TERMINATED EARLY] ====")
            return
        }

        var database: SQLiteDatabase? = null
        try {
            Log.d(TAG, "[DATABASE ACCESS] Unlocking SQLite Vault at path: ${dbFile.absolutePath}")
            
            // Open the database for read-only access to prevent corruption locking.
            database = SQLiteDatabase.openDatabase(
                dbFile.absolutePath, 
                null, 
                SQLiteDatabase.OPEN_READONLY
            )
            
            val currentTimeMs = System.currentTimeMillis()
            
            Log.d(TAG, "[DATABASE QUERY] Fetching future unexecuted task instances...")
            
            // Query Explanation: "Select all tasks where the end time hasn't happened yet *AND* 
            // the status is actively 'pending', sort them by chronology, and fetch the first 20."
            // NOTE: We now pull 'checkpoints' and 'end_time' to mathematically support continuous pings!
            val cursor = database.rawQuery(
                """SELECT id, title, start_time, config_json, checkpoints, end_time 
                   FROM task_instances 
                   WHERE end_time >= ? AND status = 'pending'
                   ORDER BY start_time ASC LIMIT 20""",
                arrayOf(currentTimeMs.toString())
            )

            // Did we actually find any tasks?
            if (cursor.moveToFirst()) {
                Log.d(TAG, "[LOGIC ROUTING] Tasks identified. Calculating precise Pre-Alarm staggered offsets.")
                
                // We will loop through the top 20 tasks to find the EXACT next action we need to take.
                var bestTriggerTime = Long.MAX_VALUE
                var bestInstanceId = ""
                var bestTitle = ""
                var bestAlarmType = "NONE"
                var bestMainTime = 0L
                var bestSoundKey = "Default"
                var bestIsStayThroughout = false

                do {
                    // Pull the row data out of the current cursor alignment
                    val id = cursor.getString(0)
                    val title = cursor.getString(1)
                    val mainStart = cursor.getLong(2)
                    val configJsonStr = cursor.getString(3) ?: "{}"
                    val checkpointsStr = cursor.getString(4) ?: "[]"
                    val mainEnd = cursor.getLong(5)

                    var currentSoundKey = "Default"
                    var isStayThroughout = false
                    try {
                        val json = org.json.JSONObject(configJsonStr)
                        if (json.has("alarms")) {
                            val alarmsObj = json.getJSONObject("alarms")
                            if (alarmsObj.has("sound_key")) currentSoundKey = alarmsObj.getString("sound_key")
                        }
                        if (json.has("verification_style")) {
                            isStayThroughout = json.getString("verification_style") == "stay_throughout"
                        }
                    } catch (e: Exception) {}

                    // Execute algorithmic check to find the absolute closest actionable alarm
                    val (triggerTime, alarmType) = findNextTrigger(mainStart, currentTimeMs, configJsonStr, checkpointsStr)
                    
                    // Keep substituting the "Best" trigger time if it's the closest to 'Now'.
                    if (triggerTime < bestTriggerTime) {
                        bestTriggerTime = triggerTime
                        bestInstanceId = id
                        bestTitle = title
                        bestAlarmType = alarmType
                        bestMainTime = mainStart
                        bestSoundKey = currentSoundKey
                        bestIsStayThroughout = isStayThroughout
                    }
                } while (cursor.moveToNext())

                // After all 20 evaluations, we officially register the "Best" absolute nearest execution.
                if (bestTriggerTime != Long.MAX_VALUE) {
                    Log.d(TAG, "[ALARM SELECTED] Earliest trigger -> Type: [$bestAlarmType], Target: [$bestTitle], Time: ${formatTimestamp(bestTriggerTime)}")
                    
                    // Dispatch the registration instruction down to the Operating System!
                    setOSAlarm(context, bestInstanceId, bestTitle, bestTriggerTime, currentTimeMs, bestAlarmType, bestMainTime, bestSoundKey, bestIsStayThroughout)
                    
                    // Since the database was fully readable, rewrite the Sticky Note cache with 
                    // this fresh list of 20 upcoming tasks, preparing for a potential future unexpected restart!
                    Log.d(TAG, "[CACHE REFRESH] Synchronizing newly evaluated queue into DE Storage Sticky Note.")
                    cursor.moveToFirst()
                    syncToStickyNote(context, cursor)
                } else {
                    Log.d(TAG, "[LOGIC ROUTING] All queried events evaluated technically in the past. Purging cache.")
                    clearStickyNote(context)
                }
            } else {
                Log.d(TAG, "[LOGIC ROUTING] SQLite confirmed zero upcoming tasks. Purging caching layer.")
                clearStickyNote(context) // Clean the sticky note, there's nothing to warn the user about
            }
            cursor.close() // ALWAYS close your cursors, memory leaks are bad!
        } catch (exception: Exception) {
            // Highly robust Exception Catching. If the DB blew up unexpectedly, just use the Sticky Note anyway!
            Log.e(TAG, "[SYSTEM FAILURE] SQLite evaluation chain completely broke down. Forcing fallback cache delegation. Exception output: ${exception.message}", exception)
            scheduleFromStickyNote(context)
        } finally {
            database?.close() // And always close your DB connection
            Log.i(TAG, "==== [MASTER SCHEDULING SEQUENCE COMPLETED] ====")
        }
    }

    /**
     * findNextTrigger()
     * 
     * The Pre-Alarm & Checkpoint Math Engine.
     * Evaluates staggered pre-alarms AND strictly scheduled structural checkpoints.
     * The moment it finds the absolutely closest event IN THE FUTURE, it returns it instantly.
     * 
     * @return Pair(TimestampToWakeUpOn, AlarmTypeString) -> "PRE_ALARM", "MAIN_ALARM", "CHECKPOINT_ALARM"
     */
    private fun findNextTrigger(
        mainStartMs: Long, 
        nowMs: Long, 
        configJsonStr: String, 
        checkpointsStr: String
    ): Pair<Long, String> {
        var leadTimeMinutes = 15
        var intervalMinutes = 2
        var isStayThroughout = false

        try {
            val json = org.json.JSONObject(configJsonStr)
            if (json.has("alarms")) {
                val alarmsObj = json.getJSONObject("alarms")
                if (alarmsObj.has("lead_time_minutes")) {
                    leadTimeMinutes = alarmsObj.getInt("lead_time_minutes")
                }
                if (alarmsObj.has("interval_minutes")) {
                    intervalMinutes = alarmsObj.getInt("interval_minutes")
                }
            }
            if (json.has("verification_style")) {
                isStayThroughout = json.getString("verification_style") == "stay_throughout"
            }
        } catch (e: Exception) {
            Log.w(TAG, "[PRE-ALARM MATH] Failed to parse config_json cleanly. Falling back to default lead: 15m, interval: 2m.")
        }
        
        Log.d(TAG, "[ALARM MATH] Config read -> Lead: $leadTimeMinutes mins, Interval: $intervalMinutes mins, Continuous: $isStayThroughout")

        // 1. Calculate T-minus staggered target intervals dynamically!
        val preAlarmOffsetsMs = mutableListOf<Long>()
        var currentOffset = leadTimeMinutes
        while (currentOffset > 0) {
            preAlarmOffsetsMs.add(currentOffset * 60 * 1000L)
            currentOffset -= intervalMinutes
        }

        var closestFutureTrigger = Long.MAX_VALUE
        var closestTriggerType = "NONE"

        // Evaluate Pre-Alarms (Iterating to cleanly find the FIRST ONE still mathematically in the future)
        for (offset in preAlarmOffsetsMs) {
            val preAlarmTime = mainStartMs - offset
            if (preAlarmTime > nowMs) {
                return Pair(preAlarmTime, "PRE_ALARM") // Pre-alarms always take absolute priority before the event
            }
        }
        
        // 2. If no future pre-alarms remain, evaluate Main Event Start boundary safely
        if (mainStartMs > nowMs) {
            if (mainStartMs < closestFutureTrigger) {
                closestFutureTrigger = mainStartMs
                closestTriggerType = "MAIN_ALARM"
            }
        }

        // 3. If "Stay Throughout", specifically slice and parse structural checkpoints
        if (isStayThroughout) {
            try {
                val checkpointsArray = org.json.JSONArray(checkpointsStr)
                for (i in 0 until checkpointsArray.length()) {
                    val checkpoint = checkpointsArray.getJSONObject(i)
                    val cpStart = if (checkpoint.has("start")) {
                        checkpoint.getLong("start")
                    } else if (checkpoint.has("scheduled_time")) {
                        checkpoint.getLong("scheduled_time")
                    } else {
                        0L
                    }

                    if (cpStart > nowMs) {
                        if (cpStart < closestFutureTrigger) {
                            closestFutureTrigger = cpStart
                            closestTriggerType = "CHECKPOINT_ALARM"
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "[ALARM MATH] Structural checkpoints strictly unparseable or empty. Bypassing.", e)
            }
        }
        
        // Returns MAX_VALUE if completely exhausted
        return Pair(closestFutureTrigger, closestTriggerType)
    }

    /**
     * markInstanceProceeded()
     * 
     * When the user clicks "Dismiss" on a MAIN ALARM, we execute this sequence.
     * It connects directly to the vault and mutates the status of the task to 'proceeded'.
     * Pre-Alarms DO NOT use this, because they aren't the final event!
     */
    fun markInstanceProceeded(context: Context, instanceId: String) {
        Log.i(TAG, "==== [MUTATION SEQUENCE INITIATED] ====")
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            // Because writing to SQLite requires Credential Access, we CANNOT mutate if the phone is locked.
            Log.e(TAG, "[MUTATION FAULT] System locked. Cannot update SQLite status for $instanceId.")
            Log.i(TAG, "==== [MUTATION SEQUENCE ABORTED] ====")
            return
        }

        var database: SQLiteDatabase? = null
        try {
            Log.d(TAG, "[MUTATION LOGIC] Attempting SQL WRITE on Vault for $instanceId...")
            database = SQLiteDatabase.openDatabase(
                dbFile.absolutePath, 
                null, 
                SQLiteDatabase.OPEN_READWRITE // Critical requirement: writable connection
            )
            // Hard string substitution replacing status for completion 
            val updateQuery = "UPDATE task_instances SET status = 'proceeded' WHERE id = ?"
            database.execSQL(updateQuery, arrayOf(instanceId))
            Log.d(TAG, "[MUTATION LOGIC] Main event $instanceId flagged strictly as proceeded.")
        } catch (exception: Exception) {
            Log.e(TAG, "[MUTATION FAULT] Read/Write execution shattered during status write. Error: ${exception.message}", exception)
        } finally {
            database?.close()
            Log.i(TAG, "==== [MUTATION SEQUENCE COMPLETED] ====")
        }
    }

    /* --- REDUNDANCY ARCHITECTURE: DEVICE PROTECTED CACHE (THE "STICKY NOTE") --- */

    /**
     * Grabs the specific Android Storage bucket capable of bypassing lock screen encryption layers.
     */
    private fun getDeviceProtectedContext(context: Context): android.content.SharedPreferences? {
        val safeContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.createDeviceProtectedStorageContext()
        } else {
            context // Pre-Android 7 didn't have FBE, so standard context works fine
        }
        // SharedPreferences is what we use as the literal "Sticky Note" storage medium.
        return safeContext.getSharedPreferences(CACHE_PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Flushes the evaluated cursor rows neatly into a long text string and saves it.
     */
    private fun syncToStickyNote(context: Context, cursor: android.database.Cursor) {
        try {
            val synchronizationSet = mutableListOf<String>()
            do {
                val identifier = cursor.getString(0)
                val taskTitle = cursor.getString(1)
                val unixTimeMs = cursor.getLong(2)
                val configJsonStr = cursor.getString(3) ?: "{}"
                val checkpointsStr = cursor.getString(4) ?: "[]"
                val endUnixTimeMs = cursor.getLong(5)
                
                // Pack the columns securely together with a pipe `|`
                // We base64 encode the JSON so it never safely interferes globally globally with our `;;` or `|` string formats.
                val safeJson = android.util.Base64.encodeToString(configJsonStr.toByteArray(), android.util.Base64.NO_WRAP)
                val safeCheckpoints = android.util.Base64.encodeToString(checkpointsStr.toByteArray(), android.util.Base64.NO_WRAP)
                
                synchronizationSet.add("$identifier|$taskTitle|$unixTimeMs|$safeJson|$safeCheckpoints|$endUnixTimeMs")
            } while (cursor.moveToNext())

            // Stitch all list items together with a double semicolon `;;` and store!
            val payloadString = synchronizationSet.joinToString(";;")
            getDeviceProtectedContext(context)?.edit()?.putString(KEY_ALARMS_LIST, payloadString)?.apply()
            
            Log.d(TAG, "[STICKY NOTE FLUSH] Synced exactly ${synchronizationSet.size} events structurally into Device Encrypted storage payload.")
        } catch (exception: Exception) {
            Log.e(TAG, "[STICKY NOTE FAULT] Catastrophic DE Storage write rejection: ${exception.message}", exception)
        }
    }

    /**
     * Erases the note completely (used when the user deletes all their tasks).
     */
    private fun clearStickyNote(context: Context) {
        getDeviceProtectedContext(context)?.edit()?.remove(KEY_ALARMS_LIST)?.apply()
        Log.d(TAG, "[STICKY NOTE FLUSH] Cached payload explicitly deleted.")
    }

    /**
     * The secondary Fallback logic exactly mimicking the Master sequence, except
     * it evaluates the `;;` string payload instead of an SQLite database.
     */
    private fun scheduleFromStickyNote(context: Context) {
        Log.i(TAG, "==== [FALLBACK RECOVERY SEQUENCE INITIATED] ====")
        
        // 1. Fetch the raw payload string
        val serializedPayload = getDeviceProtectedContext(context)?.getString(KEY_ALARMS_LIST, null)
        if (serializedPayload.isNullOrEmpty()) {
            Log.w(TAG, "[FALLBACK RECOVERY] Local DE Storage returned zero results. Total halting of schedule propagation.")
            Log.i(TAG, "==== [FALLBACK RECOVERY SEQUENCE TERMINATED] ====")
            return
        }

        val currentTimeMs = System.currentTimeMillis()
        
        // 2. Chop up the string back into a list of tasks
        val delimitedTasks = serializedPayload.split(";;")
        Log.d(TAG, "[FALLBACK RECOVERY] Payload deserialized. Inspecting ${delimitedTasks.size} raw objects.")

        var bestTriggerTime = Long.MAX_VALUE
        var bestInstanceId = ""
        var bestTitle = ""
        var bestAlarmType = "NONE"
        var bestMainTime = 0L
        var bestSoundKey = "Default"
        var bestIsStayThroughout = false

        // 3. Exactly identical mathematical iteration logic
        for (taskPayload in delimitedTasks) {
            val taskSegments = taskPayload.split("|")
            if (taskSegments.size >= 4) {
                // Slice the pieces back out
                val id = taskSegments[0]
                val title = taskSegments[1]
                val mainStart = taskSegments[2].toLongOrNull() ?: 0L
                val safeJson = taskSegments[3]
                
                // Backwards migration support natively if sticky note has legacy 4-length schemas!
                val safeCheckpoints = if (taskSegments.size >= 5) taskSegments[4] else ""
                val mainEnd = if (taskSegments.size >= 6) taskSegments[5].toLongOrNull() ?: mainStart else mainStart

                var configJsonStr = "{}"
                var checkpointsStr = "[]"
                try {
                    configJsonStr = String(android.util.Base64.decode(safeJson, android.util.Base64.DEFAULT))
                    if (safeCheckpoints.isNotEmpty()) {
                        checkpointsStr = String(android.util.Base64.decode(safeCheckpoints, android.util.Base64.DEFAULT))
                    }
                } catch (e: Exception) {}

                var currentSoundKey = "Default"
                var isStayThroughout = false
                try {
                    val json = org.json.JSONObject(configJsonStr)
                    if (json.has("alarms")) {
                        val alarmsObj = json.getJSONObject("alarms")
                        if (alarmsObj.has("sound_key")) currentSoundKey = alarmsObj.getString("sound_key")
                    }
                    if (json.has("verification_style")) {
                        isStayThroughout = json.getString("verification_style") == "stay_throughout"
                    }
                } catch (e: Exception) {}

                // Global timeline evaluation. End time strictly handles duration filtering safely.
                if (mainEnd < currentTimeMs) continue 

                // 4. Run the exact same Pre-Alarm engine here too
                val (triggerTime, alarmType) = findNextTrigger(mainStart, currentTimeMs, configJsonStr, checkpointsStr)
                
                if (triggerTime < bestTriggerTime) {
                    bestTriggerTime = triggerTime
                    bestInstanceId = id
                    bestTitle = title
                    bestAlarmType = alarmType
                    bestMainTime = mainStart
                    bestSoundKey = currentSoundKey
                    bestIsStayThroughout = isStayThroughout
                }
            }
        }
        
        // 5. Hard execute the identified time allocation to the system!
        if (bestTriggerTime != Long.MAX_VALUE) {
            Log.d(TAG, "[FALLBACK SELECTED] Earliest DE cache trigger -> Type: [$bestAlarmType], Target: $bestInstanceId, Execution: ${formatTimestamp(bestTriggerTime)}")
            
            setOSAlarm(context, bestInstanceId, bestTitle, bestTriggerTime, currentTimeMs, bestAlarmType, bestMainTime, bestSoundKey, bestIsStayThroughout)
        } else {
            Log.w(TAG, "[FALLBACK RECOVERY] Evaluated task segments possessed NO futuristic timelines. Recovery officially aborted.")
            clearStickyNote(context) // Ensure nothing stale remains running
        }
        Log.i(TAG, "==== [FALLBACK RECOVERY SEQUENCE COMPLETED] ====")
    }

    /* --- HARDWARE KERNEL REGISTRATION --- */

    /**
     * setOSAlarm()
     * 
     * The final link. Everything before this was just logic and math. 
     * This literally writes the data strictly to the Android Hardware Alarm capability.
     */
    private fun setOSAlarm(
        context: Context,
        instanceId: String,
        title: String,
        fireAtMs: Long,
        nowMs: Long,
        alarmType: String,
        mainTimeMs: Long,
        soundKey: String,
        isStayThroughout: Boolean
    ) {
        // Gain a bridge strictly over the Android Alarm System
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        // The Intent basically says: "When this goes off, hand this package to AlarmReceiver"
        val receiverIntent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("instance_id", instanceId)
            putExtra("title", title)
            putExtra("fire_at_ms", fireAtMs) // The specific alarm time
            putExtra("scheduled_at_now", nowMs)
            
            // Brand new strict typing parameters 
            putExtra("alarm_type", alarmType)
            putExtra("is_stay_throughout", isStayThroughout)
            
            putExtra("is_pre_alarm", alarmType == "PRE_ALARM") // Backward compatibility safety check
            putExtra("main_time_ms", mainTimeMs)
            putExtra("sound_key", soundKey)
        }

        // The Pending Intent locks everything securely together with heavy constraints.
        // We use Request Code '99999'. Because this number NEVER changes, every time we
        // schedule an alarm, Android instantly overwrites and deletes the old one automatically!
        // This is a zero-conflict singularity pipeline inherently preventing duplicate queues.
        val systemPendingIntent = PendingIntent.getBroadcast(
            context,
            99999, 
            receiverIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        Log.d(TAG, "[HARDWARE INSTRUCTOR] Dispatching exact wake parameters down to Android Kernel hardware...")
        try {
            // Android 12 (API 31/S) introduced catastrophic new restrictions on Alarms
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // If they have full 'Exact' permissions, we utilize the ultra-precise AlarmClock logic natively
                if (alarmManager.canScheduleExactAlarms()) {
                    val alarmClockInfo = AlarmManager.AlarmClockInfo(fireAtMs, systemPendingIntent)
                    alarmManager.setAlarmClock(alarmClockInfo, systemPendingIntent)
                    Log.d(TAG, "[HARDWARE INSTRUCTOR] Output -> Success. Strategy utilized: AlarmClock EXACT API Protocol.")
                } else {
                    // Extremely degraded fallback: If the user explicitly disabled exact permission
                    // in app settings, this guarantees it STILL fires, but Android will decide when 
                    // within a 'Doze' generalized window (usually quite close).
                    Log.w(TAG, "[HARDWARE INSTRUCTOR] Output -> Warning. Kernel denied permission. Executing Idle Bypass routing.")
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, systemPendingIntent)
                }
            } else {
                // Pre-Android 12, life was simpler and standard Exact API behaves predictably
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, systemPendingIntent)
                Log.d(TAG, "[HARDWARE INSTRUCTOR] Output -> Success. Strategy utilized: Pre-S EXACT API Protocol.")
            }
        } catch (securityException: SecurityException) {
            // A fatal scenario where system architectures block scheduling unconditionally
            Log.e(TAG, "[HARDWARE EXCEPTION] Strict permission matrix rejection forcefully halted schedule integration: ${securityException.message}", securityException)
        } catch (generalException: Exception) {
            Log.e(TAG, "Systematic routing exception resolving hardware dispatch: ${generalException.message}", generalException)
        }
    }

    /**
     * Iteratively evaluates Android filesystem layouts to deduce the absolute path 
     * of the Expo SQLite database perfectly, irrespective of differing device manufacturer choices.
     */
    private fun getDbFile(context: Context): File? {
        try {
            // Priority 1: Direct path resolving utilizing Expo's architectural layout standard
            val primaryFile = File(context.filesDir, "SQLite/commit.db")
            if (primaryFile.exists()) {
                Log.d(TAG, "[FILESYSTEM PATHING] Identified SQLite primary partition natively in normal device space.")
                return primaryFile
            }

            // Priority 2: Safe Android fallback standard implementation
            val secondaryFile = context.getDatabasePath("commit.db")
            if (secondaryFile.exists()) return secondaryFile

            // Priority 3: FBE recovery execution. 
            // If normal files fail, it checks if it EXISTS within the Device Encrypted context wrapper itself.
            val encryptedContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                context.createDeviceProtectedStorageContext()
            } else null
            
            if (encryptedContext != null) {
                val isolatedFile = File(encryptedContext.filesDir, "SQLite/commit.db")
                if (isolatedFile.exists()) {
                    Log.d(TAG, "[FILESYSTEM PATHING] Recovered encrypted file boundary from Device Encrypted FBE layer.")
                    return isolatedFile
                }
            }
        } catch (exception: Exception) {
            Log.e(TAG, "[FILESYSTEM ERROR] Storage layout pathing rejected evaluation. Reason: ${exception.message}", exception)
        }
        
        // Priority 4: Raw absolute string pathing as a total final measure
        val rawDirectoryFile = File("/data/user/0/" + context.packageName + "/files/SQLite/commit.db")
        if (rawDirectoryFile.exists()) return rawDirectoryFile

        Log.w(TAG, "[FILESYSTEM FATAL] No existing database mapped natively or artificially. Returning NULL.")
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
