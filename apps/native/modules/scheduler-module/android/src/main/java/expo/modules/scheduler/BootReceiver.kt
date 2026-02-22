package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Intercepts fundamental device boot events to guarantee the continuity of the alarm scheduling system.
 *
 * This receiver operates as the entry point for recovery upon device restart. It listens for
 * two critical system broadcasts:
 * 1. `ACTION_BOOT_COMPLETED`: Fired during a standard reboot after the user has successfully 
 *    unlocked the device, granting full access to Credential Encrypted (CE) storage.
 * 2. `ACTION_LOCKED_BOOT_COMPLETED`: Fired during Direct Boot mode immediately after power-on,
 *    prior to user authentication. This is critical for waking time-sensitive alarms from 
 *    Device Encrypted (DE) storage (the fallback cache) while the primary database is inaccessible.
 */
class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
    }

    /**
     * Triggered automatically by the Android OS when the device completes a boot sequence.
     *
     * @param context The Context in which the receiver is running.
     * @param intent The Intent being received, containing the specific boot action.
     */
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "System broadcast intercepted. Transmitted action: [$action]")

        if (action == Intent.ACTION_BOOT_COMPLETED || 
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" || 
            action == "com.htc.intent.action.QUICKBOOT_POWERON") {
            
            Log.d(TAG, "Boot confirmation verified. Initiating global alarm restoration sequence.")
            
            // Delegate the heavy lifting of determining the next immediate task to AlarmScheduler.
            AlarmScheduler.scheduleNextAlarm(context)
        }
    }
}
