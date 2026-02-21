package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.Calendar

class AlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "════════════════════════════════════════════════")
        Log.d(TAG, "⏰ AlarmManager successfully woke up device!")

        val title = intent.getStringExtra("title") ?: "Unknown Task"
        val fireAtMs = intent.getLongExtra("fire_at_ms", 0L)
        val now = System.currentTimeMillis()

        Log.d(TAG, "⏰ Alarm Triggered For: $title")
        Log.d(TAG, "⏰ Expected Fire Time: ${formatTime(fireAtMs)}")
        Log.d(TAG, "⏰ Actual Trigger Time: ${formatTime(now)}")
        Log.d(TAG, "⏰ Delay: ${now - fireAtMs} ms")

        // In a real scenario we use a WakeLock here before launching the Activity
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("title", title)
            putExtra("fire_at_ms", fireAtMs)
        }

        try {
            Log.d(TAG, "⏰ Starting AlarmActivity wrapper to wake screen...")
            context.startActivity(activityIntent)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start AlarmActivity: ${e.message}")
        }
        
        Log.d(TAG, "════════════════════════════════════════════════")
    }

    private fun formatTime(ms: Long): String {
        val cal = Calendar.getInstance()
        cal.timeInMillis = ms
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", cal)
    }
}
