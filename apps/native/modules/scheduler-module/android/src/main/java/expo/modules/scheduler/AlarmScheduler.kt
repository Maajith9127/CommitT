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
    private const val CACHE_PREFS_NAME = "UpcomingAlarmsCacheV2"
    private const val KEY_ALARMS_LIST = "AlarmsListV2"

    /**
     * ** Cached READ-ONLY database connection (Production-Critical Architecture) **
     *
     * This connection is intentionally READONLY and cached as a singleton to prevent
     * two distinct failure modes:
     *
     * 1. POSIX Error 9 ("Bad file descriptor"): Rapidly opening and closing connections
     *    on the Lenovo K12 Note's eMMC storage caused file descriptor exhaustion,
     *    crashing the scheduler. Caching eliminates open/close churn.
     *
     * 2. WAL Journal Corruption (April 2026 Root Cause):
     *    This native Kotlin connection and expo-sqlite's JS connection both access
     *    the same `commit.db` file simultaneously. When BOTH were READWRITE, they
     *    maintained competing WAL writer locks. On fast UFS storage (Samsung), the
     *    transactions completed before overlap occurred. On slow eMMC (Lenovo K12),
     *    the transactions overlapped, corrupting the WAL journal and producing fatal
     *    `database disk image is malformed` errors within seconds of first boot.
     *
     *    FIX: This connection is now READONLY. SQLite's WAL architecture permits
     *    unlimited concurrent readers alongside a single writer (expo-sqlite).
     *    The only write operation (markInstanceProceeded) uses a dedicated,
     *    short-lived READWRITE connection that immediately closes after use.
     */
    private var cachedVaultDb: SQLiteDatabase? = null

    /**
     * AUDIO RESOURCE MAP (Production Sound Pipeline)
     * -----------------------------------------------------------------------
     * Maps each alarm type to an embedded audio resource in /res/raw/.
     * This guarantees every alarm fires with a deterministic, bundled sound
     * regardless of user device configuration, system defaults, or OEM quirks.
     *
     * alarm_start -> Energetic pulse for pre-alarms, main start, and check-ins.
     * alarm_end   -> Heavy finality tone for the "Time's Up" end-of-window alarm.
     *
     * To add a new sound: Drop the .mp3 into res/raw/, add a constant here,
     * and extend resolveAlarmSound() below.
     */
    private const val SOUND_KEY_START = "alarm_start"
    private const val SOUND_KEY_END = "alarm_end"

    /**
     * resolveAlarmSound()
     * -----------------------------------------------------------------------
     * Deterministic sound routing based on alarm type. Decouples sound selection
     * from user-facing config, ensuring the correct psychological audio cue fires
     * for each phase of the accountability lifecycle.
     *
     * PRE_ALARM / MAIN_ALARM / CHECKPOINT_ALARM -> SOUND_KEY_START (alert, action)
     * END_ALARM                                 -> SOUND_KEY_END   (finality, closure)
     */
    private fun resolveAlarmSound(alarmType: String): String {
        return when (alarmType) {
            "END_ALARM" -> SOUND_KEY_END
            else -> SOUND_KEY_START  // PRE_ALARM, MAIN_ALARM, CHECKPOINT_ALARM
        }
    }

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

        try {
            if (cachedVaultDb == null || !cachedVaultDb!!.isOpen) {
                Log.d(TAG, "[DATABASE ACCESS] Unlocking SQLite Vault (READONLY) at path: ${dbFile.absolutePath}")
                
                /**
                 * ** READONLY + WAL: The Safe Coexistence Formula **
                 *
                 * OPEN_READONLY ensures this native connection never acquires a WAL
                 * writer lock, which would collide with expo-sqlite's writer on eMMC.
                 * enableWriteAheadLogging() ensures this connection reads from the WAL
                 * (matching expo-sqlite's journal_mode=wal) instead of forcing a
                 * checkpoint that would block the JS-side writer mid-transaction.
                 */
                cachedVaultDb = SQLiteDatabase.openDatabase(
                    dbFile.absolutePath, 
                    null, 
                    SQLiteDatabase.OPEN_READONLY
                )
                cachedVaultDb!!.enableWriteAheadLogging()
            }
            val database = cachedVaultDb!!
            
            val currentTimeMs = System.currentTimeMillis()
            Log.d(TAG, "[TIME] Current System Time: $currentTimeMs (${formatTimestamp(currentTimeMs)})")
            
            Log.d(TAG, "[DATABASE QUERY] Fetching future unexecuted task instances...")
            
            // Query Explanation: "Select all tasks where the end time hasn't happened yet *AND* 
            // the status is actively 'pending', sort them by chronology, and fetch the first 20."
            // NOTE: We now pull 'checkpoints' and 'end_time' to mathematically support continuous pings!
            // NOTE: We also select 'proceeding' status instances because END_ALARM must
            // fire even after the user has checked in. The end-of-window alarm is a universal
            // closure notification that applies to ALL verification styles.
            val cursor = database.rawQuery(
                """SELECT id, title, start_time, config_json, checkpoints, end_time 
                   FROM task_instances 
                   WHERE end_time >= ? AND status IN ('pending', 'proceeding')
                   ORDER BY start_time ASC LIMIT 20""",
                arrayOf(currentTimeMs.toString())
            )

            Log.d(TAG, "[DATABASE QUERY] Found ${cursor.count} potential pending instances.")

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

                var rowIndex = 0
                do {
                    // Pull the row data out of the current cursor alignment
                    val id = cursor.getString(0)
                    val title = cursor.getString(1)
                    val mainStart = cursor.getLong(2)
                    val configJsonStr = cursor.getString(3) ?: "{}"
                    val checkpointsStr = cursor.getString(4) ?: "[]"
                    val mainEnd = cursor.getLong(5)

                    Log.v(TAG, "[EVAL_ROW_$rowIndex] ID: $id | Title: $title | Start: $mainStart | End: $mainEnd")
                    Log.v(TAG, "[EVAL_ROW_$rowIndex] Config: $configJsonStr")

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
                    } catch (e: Exception) {
                        Log.e(TAG, "[EVAL_ROW_$rowIndex] JSON Metadata Parse Failure: ${e.message}")
                    }

                    // Execute algorithmic check to find the absolute closest actionable alarm
                    val (triggerTime, alarmType) = findNextTrigger(mainStart, currentTimeMs, configJsonStr, checkpointsStr, mainEnd)
                    
                    Log.v(TAG, "[EVAL_ROW_$rowIndex] Result -> Trigger: $triggerTime, Type: $alarmType")

                    // Keep substituting the "Best" trigger time if it's the closest to 'Now'.
                    if (triggerTime < bestTriggerTime) {
                        Log.d(TAG, "[BEST_FOUND] New Best: $title at $triggerTime (Type: $alarmType)")
                        bestTriggerTime = triggerTime
                        bestInstanceId = id
                        bestTitle = title
                        bestAlarmType = alarmType
                        bestMainTime = mainStart
                        // Sound routing: Use deterministic alarm-type-driven sound,
                        // falling back to user config only if resolveAlarmSound is bypassed.
                        bestSoundKey = resolveAlarmSound(alarmType)
                        bestIsStayThroughout = isStayThroughout
                    }
                    rowIndex++
                } while (cursor.moveToNext())

                // After all 20 evaluations, we officially register the "Best" absolute nearest execution.
                if (bestTriggerTime != Long.MAX_VALUE) {
                    Log.i(TAG, "[ALARM SELECTED] Earliest trigger -> Type: [$bestAlarmType], Target: [$bestTitle], InstanceId: [$bestInstanceId], Time: ${formatTimestamp(bestTriggerTime)}")
                    
                    // Dispatch the registration instruction down to the Operating System!
                    setOSAlarm(context, bestInstanceId, bestTitle, bestTriggerTime, currentTimeMs, bestAlarmType, bestMainTime, bestSoundKey, bestIsStayThroughout)
                    
                    // Since the database was fully readable, rewrite the Sticky Note cache with 
                    // this fresh list of 20 upcoming tasks, preparing for a potential future unexpected restart!
                    Log.d(TAG, "[CACHE REFRESH] Synchronizing newly evaluated queue into DE Storage Sticky Note.")
                    cursor.moveToFirst()
                    syncToStickyNote(context, cursor)
                } else {
                    Log.w(TAG, "[LOGIC ROUTING] All queried events evaluated technically in the past. Purging cache.")
                    clearStickyNote(context)
                }
            } else {
                Log.i(TAG, "[LOGIC ROUTING] SQLite confirmed zero upcoming tasks. Purging caching layer.")
                clearStickyNote(context) // Clean the sticky note, there's nothing to warn the user about
            }
            cursor.close() // ALWAYS close your cursors, memory leaks are bad!
        } catch (exception: Exception) {
            // Highly robust Exception Catching. If the DB blew up unexpectedly, just use the Sticky Note anyway!
            Log.e(TAG, "[SYSTEM FAILURE] SQLite evaluation chain completely broke down. Forcing fallback cache delegation. Exception output: ${exception.message}", exception)
            
            // Destroy the corrupt cache if a collision happens, allowing a fresh rebuild next pulse
            try {
                cachedVaultDb?.close()
            } catch (ignored: Exception) {}
            cachedVaultDb = null
            
            scheduleFromStickyNote(context)
        } finally {
            // DO NOT database?.close() here because we are natively caching the connection!
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
     * @return Pair(TimestampToWakeUpOn, AlarmTypeString) -> "PRE_ALARM", "MAIN_ALARM", "CHECKPOINT_ALARM", "END_ALARM"
     */
    private fun findNextTrigger(
        mainStartMs: Long, 
        nowMs: Long, 
        configJsonStr: String, 
        checkpointsStr: String,
        mainEndMs: Long = 0L
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
        
        // Critical System Infrastructure constraint: 
        // If intervalMinutes is exactly 0, the staggered offset while-loop becomes INFINITE,
        // causing a massive JVM Memory Leak that predictably explodes exactly at ~124MB allocation limits.
        if (intervalMinutes <= 0) intervalMinutes = 1

        Log.v(TAG, "[ALARM MATH] Lead: $leadTimeMinutes, Interval: $intervalMinutes, StayThroughout: $isStayThroughout")

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
                Log.v(TAG, "[ALARM MATH] Found future PRE_ALARM at $preAlarmTime")
                return Pair(preAlarmTime, "PRE_ALARM") // Pre-alarms always take absolute priority before the event
            }
        }
        
        // 2. If no future pre-alarms remain, evaluate Main Event Start boundary safely
        if (mainStartMs > nowMs) {
            Log.v(TAG, "[ALARM MATH] Found future MAIN_ALARM at $mainStartMs")
            if (mainStartMs < closestFutureTrigger) {
                closestFutureTrigger = mainStartMs
                closestTriggerType = "MAIN_ALARM"
            }
        }

        // 3. If "Stay Throughout", specifically slice and parse structural checkpoints
        if (isStayThroughout) {
            try {
                val checkpointsArray = org.json.JSONArray(checkpointsStr)
                Log.v(TAG, "[ALARM MATH] Evaluating ${checkpointsArray.length()} checkpoints...")
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
                        Log.v(TAG, "[ALARM MATH] Found future CHECKPOINT at $cpStart")
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

        // 4. END_ALARM: Universal window-close notification.
        //    Fires at the exact end of every event regardless of verification style.
        //    This tells the user "Time's up!" and triggers the backend verification chain.
        //    PRIORITY: Lower than PRE, MAIN, and CHECKPOINT — it only wins if all others
        //    have already passed but the end boundary is still in the future.
        if (mainEndMs > 0L && mainEndMs > nowMs) {
            Log.v(TAG, "[ALARM MATH] Found future END_ALARM at $mainEndMs")
            if (mainEndMs < closestFutureTrigger) {
                closestFutureTrigger = mainEndMs
                closestTriggerType = "END_ALARM"
            }
        }
        
        // Returns MAX_VALUE if completely exhausted
        return Pair(closestFutureTrigger, closestTriggerType)
    }

    /**
     * ** Dedicated Write Operation (Isolated READWRITE Connection) **
     *
     * This is the ONLY function in the native scheduler that writes to SQLite.
     * It uses a dedicated, short-lived READWRITE connection that is opened and
     * closed within this single function scope. This is safe because:
     *
     * 1. This function is called RARELY (only when user dismisses a MAIN alarm).
     * 2. The connection lives for ~2ms (one UPDATE statement), so there is no
     *    sustained overlap with expo-sqlite's writer.
     * 3. Unlike the cached READONLY connection (which must survive the full app
     *    lifecycle to prevent POSIX Error 9), a write connection that opens
     *    and closes once per alarm dismiss has zero churn risk.
     *
     * NOTE: This deliberately does NOT use cachedVaultDb. The cached connection
     * is READONLY and cannot execute UPDATE statements.
     */
    fun markInstanceProceeded(context: Context, instanceId: String) {
        Log.i(TAG, "==== [MUTATION SEQUENCE INITIATED] ====")
        val dbFile = getDbFile(context)
        if (dbFile == null) {
            Log.e(TAG, "[MUTATION FAULT] System locked. Cannot update SQLite status for $instanceId.")
            Log.i(TAG, "==== [MUTATION SEQUENCE ABORTED] ====")
            return
        }

        var writeDb: SQLiteDatabase? = null
        try {
            Log.d(TAG, "[MUTATION LOGIC] Opening dedicated WRITE connection for $instanceId...")
            writeDb = SQLiteDatabase.openDatabase(
                dbFile.absolutePath,
                null,
                SQLiteDatabase.OPEN_READWRITE
            )
            writeDb.enableWriteAheadLogging()

            val updateQuery = "UPDATE task_instances SET status = 'proceeded' WHERE id = ?"
            writeDb.execSQL(updateQuery, arrayOf(instanceId))
            Log.i(TAG, "[MUTATION SUCCESS] Instance $instanceId flagged strictly as proceeded.")
        } catch (exception: Exception) {
            Log.e(TAG, "[MUTATION FAULT] Read/Write execution shattered during status write. Error: ${exception.message}", exception)
        } finally {
            /**
             * ** Immediate Cleanup: No Caching for Write Connections **
             * Write connections are closed immediately to release the WAL writer
             * lock, ensuring expo-sqlite's writer is never blocked.
             */
            try {
                writeDb?.close()
            } catch (ignored: Exception) {}
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
            Log.d(TAG, "[STICKY NOTE SYNC] Full Payload String: $payloadString")
            getDeviceProtectedContext(context)?.edit()?.putString(KEY_ALARMS_LIST, payloadString)?.apply()
            
            Log.i(TAG, "[STICKY NOTE FLUSH] Synced exactly ${synchronizationSet.size} events structurally into Device Encrypted storage payload.")
        } catch (exception: Exception) {
            Log.e(TAG, "[STICKY NOTE FAULT] Catastrophic DE Storage write rejection: ${exception.message}", exception)
        }
    }

    /**
     * Erases the note completely (used when the user deletes all their tasks).
     */
    private fun clearStickyNote(context: Context) {
        Log.i(TAG, "[STICKY NOTE] Explicitly clearing cached payload.")
        getDeviceProtectedContext(context)?.edit()?.remove(KEY_ALARMS_LIST)?.apply()
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

        Log.d(TAG, "[FALLBACK RECOVERY] Raw Payload: $serializedPayload")

        val currentTimeMs = System.currentTimeMillis()
        
        // 2. Chop up the string back into a list of tasks
        val delimitedTasks = serializedPayload.split(";;")
        Log.i(TAG, "[FALLBACK RECOVERY] Payload deserialized. Inspecting ${delimitedTasks.size} raw objects.")

        var bestTriggerTime = Long.MAX_VALUE
        var bestInstanceId = ""
        var bestTitle = ""
        var bestAlarmType = "NONE"
        var bestMainTime = 0L
        var bestSoundKey = "Default"
        var bestIsStayThroughout = false

        // 3. Exactly identical mathematical iteration logic
        for (taskPayload in delimitedTasks) {
            Log.v(TAG, "[FALLBACK_EVAL] Segments: $taskPayload")
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
                } catch (e: Exception) {
                    Log.e(TAG, "[FALLBACK_EVAL] Base64 Decode Failure: ${e.message}")
                }

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
                if (mainEnd < currentTimeMs) {
                    Log.v(TAG, "[FALLBACK_EVAL] Skipping expired: $title (End: $mainEnd)")
                    continue 
                }

                // 4. Run the exact same Pre-Alarm engine here too
                val (triggerTime, alarmType) = findNextTrigger(mainStart, currentTimeMs, configJsonStr, checkpointsStr, mainEnd)
                
                if (triggerTime < bestTriggerTime) {
                    Log.d(TAG, "[FALLBACK_BEST] New Fallback Best: $title at $triggerTime")
                    bestTriggerTime = triggerTime
                    bestInstanceId = id
                    bestTitle = title
                    bestAlarmType = alarmType
                    bestMainTime = mainStart
                    // Sound routing: Deterministic alarm-type-driven sound (mirrors primary flow)
                    bestSoundKey = resolveAlarmSound(alarmType)
                    bestIsStayThroughout = isStayThroughout
                }
            }
        }
        
        // 5. Hard execute the identified time allocation to the system!
        if (bestTriggerTime != Long.MAX_VALUE) {
            Log.i(TAG, "[FALLBACK SELECTED] Earliest DE cache trigger -> Type: [$bestAlarmType], Target: $bestInstanceId, Execution: ${formatTimestamp(bestTriggerTime)}")
            
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
        Log.i(TAG, "[HARDWARE INSTRUCTOR] Preparing OS registration for: $title ($instanceId) at $fireAtMs")
        
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

        Log.v(TAG, "[HARDWARE INSTRUCTOR] Intent Payload Built -> Type: $alarmType, Sound: $soundKey, StayThroughout: $isStayThroughout")

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
                    Log.i(TAG, "[HARDWARE INSTRUCTOR] Success. Strategy: AlarmClock EXACT.")
                } else {
                    // Extremely degraded fallback: If the user explicitly disabled exact permission
                    Log.w(TAG, "[HARDWARE INSTRUCTOR] Warning. Kernel denied exact permission. Strategy: setAndAllowWhileIdle.")
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, systemPendingIntent)
                }
            } else {
                // Pre-Android 12, life was simpler and standard Exact API behaves predictably
                Log.d(TAG, "[HARDWARE INSTRUCTOR] Strategy: setExactAndAllowWhileIdle.")
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, systemPendingIntent)
            }
        } catch (securityException: SecurityException) {
            // A fatal scenario where system architectures block scheduling unconditionally
            Log.e(TAG, "[HARDWARE EXCEPTION] Strict permission matrix rejection: ${securityException.message}", securityException)
        } catch (generalException: Exception) {
            Log.e(TAG, "Systematic routing exception resolving hardware dispatch: ${generalException.message}", generalException)
        }
    }

    /**
     * Iteratively evaluates Android filesystem layouts to deduce the absolute path 
     * of the Expo SQLite database perfectly, irrespective of differing device manufacturer choices.
     */
    private fun getDbFile(context: Context): File? {
        Log.v(TAG, "[FILESYSTEM] Attempting to resolve SQLite database location...")
        try {
            // Priority 1: Direct path resolving utilizing Expo's architectural layout standard
            val primaryFile = File(context.filesDir, "SQLite/commit.db")
            Log.v(TAG, "[FILESYSTEM] Path 1 CHECK: ${primaryFile.absolutePath}")
            if (primaryFile.exists()) {
                Log.d(TAG, "[FILESYSTEM PATHING] Path 1 SUCCESS (Expo Default).")
                return primaryFile
            }

            // Priority 2: Safe Android fallback standard implementation
            val secondaryFile = context.getDatabasePath("commit.db")
            Log.v(TAG, "[FILESYSTEM] Path 2 CHECK: ${secondaryFile.absolutePath}")
            if (secondaryFile.exists()) {
                Log.d(TAG, "[FILESYSTEM PATHING] Path 2 SUCCESS (Generic).")
                return secondaryFile
            }

            // Priority 3: FBE recovery execution. 
            val encryptedContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                context.createDeviceProtectedStorageContext()
            } else null
            
            if (encryptedContext != null) {
                val isolatedFile = File(encryptedContext.filesDir, "SQLite/commit.db")
                Log.v(TAG, "[FILESYSTEM] Path 3 CHECK: ${isolatedFile.absolutePath}")
                if (isolatedFile.exists()) {
                    Log.d(TAG, "[FILESYSTEM PATHING] Path 3 SUCCESS (FBE Isolated).")
                    return isolatedFile
                }
            }
        } catch (exception: Exception) {
            Log.e(TAG, "[FILESYSTEM ERROR] Storage layout pathing rejected evaluation: ${exception.message}")
        }
        
        // Priority 4: Raw absolute string pathing as a total final measure
        val rawDirectoryFile = File("/data/user/0/" + context.packageName + "/files/SQLite/commit.db")
        if (rawDirectoryFile.exists()) return rawDirectoryFile

        Log.w(TAG, "[FILESYSTEM FATAL] No existing database mapped natively or artificially. Returning NULL.")
        return null
    }

    private fun formatTimestamp(timeMs: Long): String {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = timeMs
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", calendar)
    }
}
