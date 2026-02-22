package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "════════════════════════════════════════════════")
        Log.d(TAG, "🔄 Device Reboot Detected: ${intent.action}")

        if (intent.action == Intent.ACTION_BOOT_COMPLETED || 
            intent.action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
            
            Log.d(TAG, "🔄 Asking AlarmScheduler to restore the next alarm from SQLite...")
            
            // Because our new scheduleNextAlarm function naturally looks into the future,
            // we don't need any complex "recovery" logic. We just ask it to find the
            // very next chronologically upcoming task and schedule it with the OS!
            AlarmScheduler.scheduleNextAlarm(context)
        }
        
        Log.d(TAG, "════════════════════════════════════════════════")
    }
}
