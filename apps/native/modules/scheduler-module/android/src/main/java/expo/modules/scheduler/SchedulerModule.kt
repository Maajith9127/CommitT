package expo.modules.scheduler

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * SchedulerModule
 * 
 * Acts as the Native Bridge between your JavaScript (React Native/Expo) code 
 * and the Android hardware-level scheduling subsystems (`AlarmManager`).
 * 
 * Think of this as the "Front Door". React Native calls functions in here, 
 * and this file safely routes those requests deep into native Android code.
 */
class SchedulerModule : Module() {

    companion object {
        private const val TAG = "SchedulerModule"
    }

    /**
     * This exposes functions directly to React Native. 
     * You can call these from `index.ts`.
     */
    override fun definition() = ModuleDefinition {
        // The name the module will be known as in JavaScript
        Name("SchedulerModule")

        /**
         * scheduleNextAlarm()
         * 
         * Call this from React Native whenever:
         * 1. A new task is created.
         * 2. An existing task is updated or deleted.
         * 3. The user manually forces an alarm sync.
         */
        Function("scheduleNextAlarm") {
            Log.i(TAG, "==== [JS BRIDGE INVOKED] ====")
            Log.d(TAG, "[JS BRIDGE] scheduleNextAlarm() requested by JavaScript.")
            
            // Gain access to the Android Application Context from React Native
            val context = appContext.reactContext
            if (context == null) {
                Log.e(TAG, "[JS BRIDGE] CRITICAL: React context is NULL. Cannot resolve Android Application instance.")
                return@Function mapOf("success" to false, "error" to "React context missing.")
            }
            
            Log.v(TAG, "[JS BRIDGE] Context resolved: ${context.packageName}. Delegating to native engine...")
            
            // Handoff logic entirely to AlarmScheduler so this bridge file stays incredibly clean
            AlarmScheduler.scheduleNextAlarm(context)
            
            Log.i(TAG, "==== [JS BRIDGE DELEGATION SUCCESSFUL] ====")
            
            // Return a success JSON payload back to the JavaScript promise
            mapOf("success" to true)
        }
    }
}
