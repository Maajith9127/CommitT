package expo.modules.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver
 * 
 * This file is the system's "First Responder" when the phone restarts.
 * It intercepts fundamental device boot events to guarantee the continuity 
 * of the alarm scheduling system. Without this, alarms would be wiped out 
 * every time the user turns their phone off and on.
 */
class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
    }

    /**
     * This function is automatically fired by the Android OS immediately after 
     * the system boots up.
     */
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.i(TAG, "==== [BOOT SEQUENCE INITIALIZED] ====")
        Log.d(TAG, "System broadcast intercepted. Transmitted action: [$action]")

        // We listen for four different types of boot actions to support all Android versions:
        // 1 & 2: ACTION_BOOT_COMPLETED is the standard signal when the phone is fully unlocked.
        // 3: ACTION_LOCKED_BOOT_COMPLETED happens immediately when the screen turns on, BEFORE the passcode.
        // 4 & 5: QUICKBOOT actions support older HTC/Samsung proprietary fast-boot architectures.
        if (action == Intent.ACTION_BOOT_COMPLETED || 
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" || 
            action == "com.htc.intent.action.QUICKBOOT_POWERON") {
            
            Log.d(TAG, "[BOOT SEQUENCE] Validation successful. Action: $action")
            Log.d(TAG, "[BOOT SEQUENCE] Triggering global alarm restoration sequence now via AlarmScheduler...")
            
            // Delegate the heavy lifting to AlarmScheduler. It will look at the database
            // and figure out what the next alarm should be.
            AlarmScheduler.scheduleNextAlarm(context)
            
            Log.i(TAG, "==== [BOOT SEQUENCE DISPATCH COMPLETE] ====")
        } else {
            // An unrecognized broadcast somehow made its way here. We safely ignore it.
            Log.w(TAG, "[BOOT SEQUENCE] Unrecognized action ignored: $action")
        }
    }
}
