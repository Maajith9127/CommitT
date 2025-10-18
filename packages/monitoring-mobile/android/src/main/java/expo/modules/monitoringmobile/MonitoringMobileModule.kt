package expo.modules.monitoringmobile

import android.app.Activity
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.monitoringmobile.database.MonitoringRepository
import expo.modules.monitoringmobile.worker.DataSyncWorker
import kotlinx.coroutines.runBlocking
import java.net.URL

class MonitoringMobileModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exception("React context is not available")

  private val repository by lazy { MonitoringRepository(context) }

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('MonitoringMobile')` in JavaScript.
    Name("MonitoringMobile")

    // Defines event names that the module can send to JavaScript.
    Events("onMonitoringEvent", "onPermissionStatusChanged")

    // Start monitoring service
    AsyncFunction("startMonitoring") { ->
      try {
        val serviceIntent = Intent(context, MonitoringForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(serviceIntent)
        } else {
          context.startService(serviceIntent)
        }
        Log.d(TAG, "Monitoring service started via module")
        true
      } catch (e: Exception) {
        Log.e(TAG, "Failed to start monitoring service", e)
        false
      }
    }

    // Stop monitoring service
    AsyncFunction("stopMonitoring") { ->
      try {
        val serviceIntent = Intent(context, MonitoringForegroundService::class.java)
        context.stopService(serviceIntent)
        Log.d(TAG, "Monitoring service stopped via module")
        true
      } catch (e: Exception) {
        Log.e(TAG, "Failed to stop monitoring service", e)
        false
      }
    }

    // Check if monitoring service is active
    AsyncFunction("isMonitoringActive") { ->
      try {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val runningServices = activityManager.getRunningServices(Int.MAX_VALUE)
        val isRunning = runningServices.any { serviceInfo ->
          serviceInfo.service.className == MonitoringForegroundService::class.java.name
        }
        Log.d(TAG, "Monitoring service active: $isRunning")
        isRunning
      } catch (e: Exception) {
        Log.e(TAG, "Failed to check monitoring service status", e)
        false
      }
    }

    // Check usage stats permission
    AsyncFunction("hasUsageStatsPermission") { ->
      checkUsageStatsPermission()
    }

    // Request usage stats permission (opens settings)
    AsyncFunction("requestUsagePermission") { ->
      try {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        Log.d(TAG, "Opened usage access settings")
        true
      } catch (e: Exception) {
        Log.e(TAG, "Failed to open usage access settings", e)
        false
      }
    }

    // Get usage data for date range
    AsyncFunction("getUsageData") { startDate: String, endDate: String ->
      try {
        val usageData = runBlocking {
          repository.getUsageData(startDate, endDate)
        }
        // Convert to map format for JavaScript
        usageData.map { session ->
          mapOf(
            "id" to session.id,
            "appPackage" to session.appPackage,
            "startTime" to session.startTime,
            "endTime" to session.endTime,
            "duration" to session.duration,
            "isActive" to session.isActive
          )
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to get usage data", e)
        emptyList<Map<String, Any>>()
      }
    }

    // Get daily summaries for date range
    AsyncFunction("getDailySummaries") { startDate: String, endDate: String ->
      try {
        val summaries = runBlocking {
          repository.getDailySummaries(startDate, endDate)
        }
        // Convert to map format for JavaScript
        summaries.map { summary ->
          mapOf(
            "date" to summary.date,
            "totalUsageTime" to summary.totalUsageTime,
            "idleTime" to summary.idleTime,
            "sessionCount" to summary.sessionCount,
            "lastUpdated" to summary.lastUpdated
          )
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to get daily summaries", e)
        emptyList<Map<String, Any>>()
      }
    }

    // Trigger immediate data sync
    AsyncFunction("syncDataNow") { ->
      try {
        DataSyncWorker.triggerImmediateSync(context)
        Log.d(TAG, "Triggered immediate data sync")
        true
      } catch (e: Exception) {
        Log.e(TAG, "Failed to trigger data sync", e)
        false
      }
    }

    // Get current permission status details
    AsyncFunction("getPermissionStatus") { ->
      mapOf(
        "usageStatsGranted" to checkUsageStatsPermission(),
        "canRequestPermission" to true // Always can request via settings
      )
    }
  }

  private fun checkUsageStatsPermission(): Boolean {
    return try {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      }
      mode == AppOpsManager.MODE_ALLOWED
    } catch (e: Exception) {
      Log.e(TAG, "Error checking usage stats permission", e)
      false
    }
  }

  companion object {
    private const val TAG = "MonitoringMobileModule"
  }
}
