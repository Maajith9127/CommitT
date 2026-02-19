package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Fires on phone restart (BOOT_COMPLETED or LOCKED_BOOT_COMPLETED).
 * Re-schedules all alarms from device-protected storage.
 *
 * Device-protected storage is accessible immediately after boot,
 * even before the user unlocks the phone — just like the stock alarm clock.
 *
 * Both events call rescheduleAllFromBootStorage(), which is smart enough to:
 * - Reuse saved fire time if still in the future
 * - Fire immediately if the alarm was recently missed (during boot)
 * - Recalculate next slot only if the alarm is truly old
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED) return

        Log.d(TAG, "📱 Boot event received ($action) — re-scheduling alarms from device storage")

        val pendingResult = goAsync()

        Thread {
            try {
                AlarmScheduler.rescheduleAllFromBootStorage(context)
                Log.d(TAG, "✅ All alarms re-scheduled after boot (no unlock needed)")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to re-schedule: ${e.message}")
            } finally {
                pendingResult.finish()
            }
        }.start()
    }
}
