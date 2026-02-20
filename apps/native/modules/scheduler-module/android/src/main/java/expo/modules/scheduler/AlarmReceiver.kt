package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log

/**
 * Fires when an alarm triggers (even if app is killed).
 * Acquires a wake lock, then starts AlarmActivity or PreAlarmActivity.
 */
class AlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "AlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "════════════════════════════════════════════════")
        Log.d(TAG, "⏰ AlarmReceiver.onReceive() TRIGGERED")
        Log.d(TAG, "⏰ Time: ${System.currentTimeMillis()} (${AlarmScheduler.formatTime(System.currentTimeMillis())})")
        Log.d(TAG, "⏰ Action: ${intent.action}")

        val convexId = intent.getStringExtra("convex_id")
        val title = intent.getStringExtra("title") ?: "Alarm"
        val recurrenceJson = intent.getStringExtra("recurrence_json")
        val alarmId = intent.getIntExtra("alarm_id", 0)
        val endTimeMs = intent.getLongExtra("end_time_ms", 0L)
        val isPreAlarm = intent.getBooleanExtra("is_pre_alarm", false)
        val preAlarmOffset = intent.getIntExtra("pre_alarm_offset", 0)

        Log.d(TAG, "⏰ Extras → convexId=$convexId, title='$title', alarmId=$alarmId, endTimeMs=$endTimeMs, isPreAlarm=$isPreAlarm")
        Log.d(TAG, "⏰ Extras → recurrenceJson=${recurrenceJson?.take(100)}")

        if (convexId == null && !isPreAlarm) {
            Log.e(TAG, "❌ ABORT: convex_id is null! Intent extras may have been stripped.")
            return
        }
        if (recurrenceJson == null && !isPreAlarm) {
            Log.e(TAG, "❌ ABORT: recurrence_json is null! Intent extras may have been stripped.")
            return
        }

        // Check screen/power state
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        Log.d(TAG, "⏰ Screen interactive: ${powerManager.isInteractive}")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            Log.d(TAG, "⏰ Device idle: ${powerManager.isDeviceIdleMode}")
        }

        // Acquire wake lock
        Log.d(TAG, "⏰ Acquiring wake lock...")
        val wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "commit:AlarmWakeLock"
        )
        wakeLock.acquire(60 * 1000L)
        Log.d(TAG, "⏰ Wake lock acquired (60s timeout)")

        // Launch AlarmActivity for both MAIN and PRE alarms
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("convex_id", convexId)
            putExtra("title", title)
            putExtra("recurrence_json", recurrenceJson)
            putExtra("alarm_id", alarmId)
            putExtra("end_time_ms", endTimeMs)
            putExtra("is_pre_alarm", isPreAlarm)
            putExtra("pre_alarm_offset", preAlarmOffset)
        }

        try {
            Log.d(TAG, "⏰ Starting AlarmActivity...")
            context.startActivity(activityIntent)
            Log.d(TAG, "✅ AlarmActivity started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "❌ FAILED to start AlarmActivity: ${e.message}")
            Log.e(TAG, "❌ Stack trace: ${e.stackTraceToString()}")
        }

        wakeLock.release()
        Log.d(TAG, "⏰ Wake lock released")
        Log.d(TAG, "════════════════════════════════════════════════")
    }
}
