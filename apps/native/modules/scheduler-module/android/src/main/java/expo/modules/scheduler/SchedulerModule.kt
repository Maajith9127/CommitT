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

        Function("scheduleForTask") { convexId: String ->
            Log.d(TAG, "📥 JS → scheduleForTask($convexId)")
            val context = appContext.reactContext ?: return@Function mapOf("success" to false)
            AlarmScheduler.scheduleAlarm(context, convexId)
        }

        Function("rescheduleForTask") { convexId: String ->
            Log.d(TAG, "📥 JS → rescheduleForTask($convexId)")
            val context = appContext.reactContext ?: return@Function mapOf("success" to false)
            AlarmScheduler.scheduleAlarm(context, convexId)
        }

        Function("cancelForTask") { convexId: String ->
            Log.d(TAG, "📥 JS → cancelForTask($convexId)")
            val context = appContext.reactContext ?: return@Function mapOf("success" to false)
            AlarmScheduler.cancelAlarm(context, convexId)
        }

        Function("scheduleNextAlarm") {
            Log.d(TAG, "📥 JS → scheduleNextAlarm()")
            val context = appContext.reactContext ?: return@Function mapOf("success" to false)
            AlarmScheduler.scheduleNextAlarm(context)
            mapOf("success" to true)
        }
    }
}
