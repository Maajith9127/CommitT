package expo.modules.scheduler

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Acts as the native bridging interface between the JavaScript/React Native lifecycle 
 * and the Android hardware-level scheduling subsystems.
 *
 * Structural Hierarchy:
 * 1. JavaScript Context (React Native)
 * 2. SchedulerModule (This Bridge)
 * 3. AlarmScheduler (Business Logic & Storage Routing)
 * 4. OS AlarmManager (Hardware Clock)
 * 5. AlarmReceiver & AlarmActivity (Dispatch & UI)
 *
 * This module is kept intentionally lightweight. All core business logic regarding 
 * storage reading, caching, and precise timing calculations are delegated to [AlarmScheduler].
 */
class SchedulerModule : Module() {

    companion object {
        private const val TAG = "SchedulerModule"
    }

    /**
     * Defines the interface mapping exposed to the JavaScript layer.
     */
    override fun definition() = ModuleDefinition {
        Name("SchedulerModule")

        /**
         * Instructs the native system to evaluate the entire pipeline of scheduled tasks,
         * locate the nearest chronological event, and firmly queue it with the OS AlarmManager.
         *
         * This function should be invoked whenever a task is created, modified, deleted, 
         * or when an active alarm has just concluded.
         *
         * @return A map containing a boolean `success` indicating whether the delegation occurred.
         */
        Function("scheduleNextAlarm") {
            Log.d(TAG, "Registered synchronization request from JavaScript layer.")
            
            val context = appContext.reactContext ?: return@Function mapOf(
                "success" to false, 
                "error" to "React context is currently unavailable."
            )
            
            // Dispatch the scheduling execution to the central singleton.
            AlarmScheduler.scheduleNextAlarm(context)
            
            mapOf("success" to true)
        }
    }
}
