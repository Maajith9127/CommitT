package expo.modules.scheduler

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Module bridge for the scheduling system.
 *
 * JS → SchedulerModule → AlarmScheduler → AlarmManager → AlarmReceiver → AlarmActivity
 *
 * All heavy logic is in AlarmScheduler (shared with receivers).
 * This module just bridges JS ↔ AlarmScheduler.
 */
class SchedulerModule : Module() {

    companion object {
        private const val TAG = "SchedulerModule"
    }

    override fun definition() = ModuleDefinition {

        Name("SchedulerModule")

        // CREATE: Schedule the next alarm for a task
        Function("scheduleForTask") { convexId: String ->
            Log.d(TAG, "📥 JS → scheduleForTask('$convexId')")
            val context = appContext.reactContext
            if (context == null) {
                Log.e(TAG, "❌ No reactContext available!")
                return@Function mapOf("success" to false, "error" to "No context")
            }
            val result = AlarmScheduler.scheduleAlarm(context, convexId)
            Log.d(TAG, "📤 scheduleForTask result: $result")
            result
        }

        // UPDATE: Cancel existing + schedule with new rules
        Function("rescheduleForTask") { convexId: String ->
            Log.d(TAG, "📥 JS → rescheduleForTask('$convexId')")
            val context = appContext.reactContext
            if (context == null) {
                Log.e(TAG, "❌ No reactContext available!")
                return@Function mapOf("success" to false, "error" to "No context")
            }
            val cancelResult = AlarmScheduler.cancelAlarm(context, convexId)
            Log.d(TAG, "📤 cancelAlarm result: $cancelResult")
            val schedResult = AlarmScheduler.scheduleAlarm(context, convexId)
            Log.d(TAG, "📤 scheduleAlarm result: $schedResult")
            schedResult
        }

        // DELETE: Cancel all alarms for a task
        Function("cancelForTask") { convexId: String ->
            Log.d(TAG, "📥 JS → cancelForTask('$convexId')")
            val context = appContext.reactContext
            if (context == null) {
                Log.e(TAG, "❌ No reactContext available!")
                return@Function mapOf("success" to false, "error" to "No context")
            }
            val result = AlarmScheduler.cancelAlarm(context, convexId)
            Log.d(TAG, "📤 cancelForTask result: $result")
            result
        }
    }
}
