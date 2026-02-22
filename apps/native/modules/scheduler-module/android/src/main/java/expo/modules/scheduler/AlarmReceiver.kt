package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.Calendar

/**
 * Captures precisely timed hardware wakeups driven by the Android AlarmManager.
 *
 * This receiver operates entirely in the background and is tasked with catching the
 * exact moment an alarm reaches its scheduled time. Once caught, it possesses the authority
 * to launch the full-screen [AlarmActivity] to visually alert the user.
 */
class AlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AlarmReceiver"
        
        // Intent extraction keys explicitly synchronized with AlarmScheduler
        private const val EXTRA_INSTANCE_ID = "instance_id"
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_FIRE_AT_MS = "fire_at_ms"
    }

    /**
     * Invoked immediately when the hardware clock aligns with the scheduled AlarmManager request.
     *
     * @param context The standard Context in which the receiver operates.
     * @param intent The Intent strictly populated by AlarmScheduler containing the task identity.
     */
    override fun onReceive(context: Context, intent: Intent) {
        val instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID) ?: ""
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Unknown Task"
        val fireAtMs = intent.getLongExtra(EXTRA_FIRE_AT_MS, 0L)
        val currentTimeMs = System.currentTimeMillis()

        Log.d(TAG, "Hardware alarm successfully dispatched. Target: [$title], Identifier: [$instanceId]")
        
        // Calculate the drift between the requested hardware time and actual wake time for debugging
        val driftMs = currentTimeMs - fireAtMs
        Log.d(TAG, "Execution Metrics -> Expected: ${formatTimestamp(fireAtMs)} | Actual: ${formatTimestamp(currentTimeMs)} | Drift: $driftMs ms")

        // Construct the intent designed to force the rendering of the Alert UI
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                    
            putExtra(EXTRA_INSTANCE_ID, instanceId)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_FIRE_AT_MS, fireAtMs)
        }

        try {
            Log.d(TAG, "Elevating execution to foreground layer. Initiating AlarmActivity.")
            context.startActivity(activityIntent)
        } catch (exception: Exception) {
            Log.e(TAG, "Critical failure during AlarmActivity foreground elevation: ${exception.message}", exception)
        }
    }

    /**
     * Helper utility designed to convert absolute epoch timestamps into human-readable definitions
     * exclusively meant for developer logging and telemetry.
     */
    private fun formatTimestamp(timeMs: Long): String {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = timeMs
        return String.format("%tA %<tB %<td at %<tI:%<tM:%<tS %<tp", calendar)
    }
}
