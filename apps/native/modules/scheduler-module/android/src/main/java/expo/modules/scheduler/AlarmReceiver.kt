package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.Calendar

/**
 * AlarmReceiver
 * 
 * This file is effectively a "Tripwire" waiting precisely in the background.
 * It is solely responsible for capturing hardware wakeups driven by the Android 
 * `AlarmManager` clock. When the exact second strikes, the OS hits this file.
 */
class AlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AlarmReceiver"
        
        // These are strictly matching keys we use to unwrap data from AlarmScheduler
        private const val EXTRA_INSTANCE_ID = "instance_id"
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_FIRE_AT_MS = "fire_at_ms"
        private const val EXTRA_IS_PRE_ALARM = "is_pre_alarm"
        private const val EXTRA_MAIN_TIME_MS = "main_time_ms"
        private const val EXTRA_SOUND_KEY = "sound_key"
        private const val EXTRA_ALARM_TYPE = "alarm_type"
        private const val EXTRA_IS_STAY_THROUGHOUT = "is_stay_throughout"
    }

    /**
     * Fired by the Android Operating System at the exact millisecond requested.
     */
    override fun onReceive(context: Context, intent: Intent) {
        val currentTimeMs = System.currentTimeMillis()
        Log.i(TAG, "==== [HARDWARE ALARM TRIGGERED] ====")
        Log.d(TAG, "[HARDWARE TRIGGER] Operating System successfully pinged AlarmReceiver at ${formatTimestamp(currentTimeMs)}.")

        // 0. Log the raw intent to see all available keys
        val bundle = intent.extras
        if (bundle != null) {
            Log.v(TAG, "[HARDWARE TRIGGER] Raw Intent Keys: ${bundle.keySet().joinToString(", ")}")
            for (key in bundle.keySet()) {
                Log.v(TAG, "[HARDWARE TRIGGER]   $key -> ${bundle.get(key)}")
            }
        }

        // 1. Unwrap all custom data tied to this alarm
        val instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID) ?: ""
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Unknown Task"
        val fireAtMs = intent.getLongExtra(EXTRA_FIRE_AT_MS, 0L)
        val isPreAlarm = intent.getBooleanExtra(EXTRA_IS_PRE_ALARM, false)
        val mainTimeMs = intent.getLongExtra(EXTRA_MAIN_TIME_MS, 0L)
        val soundKey = intent.getStringExtra(EXTRA_SOUND_KEY) ?: "Default"
        val alarmType = intent.getStringExtra(EXTRA_ALARM_TYPE) ?: if (isPreAlarm) "PRE_ALARM" else "MAIN_ALARM"
        val isStayThroughout = intent.getBooleanExtra(EXTRA_IS_STAY_THROUGHOUT, false)

        val typeText = alarmType.replace("_", " ")
        Log.i(TAG, "[HARDWARE TRIGGER] Parsed -> Task: [$title], Type: [$typeText], ID: [$instanceId], Sound: [$soundKey]")
        
        // Check for Android "Doze" drift - if the OS was highly constrained on battery, 
        // it may have delayed this execution slightly.
        val driftMs = currentTimeMs - fireAtMs
        Log.d(TAG, "[HARDWARE METRICS] Target: ${formatTimestamp(fireAtMs)} | Actual: ${formatTimestamp(currentTimeMs)} | Drift: $driftMs ms")

        if (driftMs > 30000) {
            Log.w(TAG, "[HARDWARE WARNING] High drift detected ($driftMs ms). OS Battery optimization might be delaying alarms.")
        }

        // 2. Prepare an Intent to aggressively launch the full-screen visual UI
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            // These flags declare: "Create a brand new window, obliterate anything in the way, and put it on top."
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                    
            // Repackage the data into the Activity intent so the UI can read it
            putExtra(EXTRA_INSTANCE_ID, instanceId)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_FIRE_AT_MS, fireAtMs)
            putExtra(EXTRA_IS_PRE_ALARM, isPreAlarm)
            putExtra(EXTRA_MAIN_TIME_MS, mainTimeMs)
            putExtra(EXTRA_SOUND_KEY, soundKey)
            putExtra(EXTRA_ALARM_TYPE, alarmType)
            putExtra(EXTRA_IS_STAY_THROUGHOUT, isStayThroughout)
        }

        try {
            Log.d(TAG, "[UI ELEVATION] Routing execution to foreground. Launching full-screen AlarmActivity...")
            
            // 🚨 CRITICAL RESILIENCE FIX 🚨 
            // Before we even ATTEMPT to show the UI... calculate and guarantee the NEXT alarm.
            Log.i(TAG, "[RESILIENCE] Triggering immediate forward-propagation of the schedule chain.")
            AlarmScheduler.scheduleNextAlarm(context)

            // Execute the hand-off to display the UI!
            context.startActivity(activityIntent)
            
            Log.i(TAG, "[UI ELEVATION] Activity request successfully handed to OS.")
        } catch (exception: Exception) {
            // Critical Exception Handling: Background capabilities might be restricted on some extreme devices (e.g., Xiaomi/MIUI).
            Log.e(TAG, "[CRITICAL UI FAILURE] OS blocked AlarmActivity foreground elevation: ${exception.message}", exception)
        }
        
        Log.i(TAG, "==== [HARDWARE ALARM CONCLUDED] ====")
    }

    /**
     * Developer utility: Converts raw Unix timestamp numbers into beautiful Human-Readable strings 
     * exclusively for logging. Ex: 'Sunday February 22 at 10:30:00 PM'
     */
    private fun formatTimestamp(timeMs: Long): String {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = timeMs
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", calendar)
    }
}
