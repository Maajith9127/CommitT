package expo.modules.monitoring


import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.monitoring.database.MonitoringRepository
import expo.modules.monitoring.worker.DataSyncWorker
import java.text.SimpleDateFormat
import java.util.*

class MonitoringModule : Module() {
    private lateinit var context: Context
    private lateinit var repository: MonitoringRepository
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    companion object {
        private const val TAG = "MonitoringModule"
        private var instance: MonitoringModule? = null

        // Static method for other components to emit events
        fun emitMonitoringEvent(type: String, data: Map<String, Any>, timestamp: Long = System.currentTimeMillis()) {
            instance?.sendEvent("onMonitoringEvent", mapOf(
                "type" to type,
                "data" to data,
                "timestamp" to timestamp
            ))
        }

        fun emitPermissionStatusChanged(granted: Boolean, canRequest: Boolean) {
            instance?.sendEvent("onPermissionStatusChanged", mapOf(
                "usageStatsGranted" to granted,
                "canRequestPermission" to canRequest
            ))
        }
    }

    override fun definition() = ModuleDefinition {
        Name("Monitoring")

        // Initialize context and repository
        context = appContext.reactContext ?: throw Exception("React context not available")
        repository = MonitoringRepository(context)

        // Set static instance for event emission
        instance = this

        // Event definitions for real-time monitoring updates
        Events("onMonitoringEvent", "onPermissionStatusChanged")

        // Service Control - Start/stop monitoring lifecycle
        AsyncFunction("startMonitoring") {
            startMonitoringService()
        }

        AsyncFunction("stopMonitoring") {
            stopMonitoringService()
        }

        AsyncFunction("isMonitoringActive") {
            MonitoringForegroundService.isRunning
        }

        // Permission Handling - Android usage stats access
        AsyncFunction("hasUsageStatsPermission") {
            checkUsageStatsPermission()
        }

        AsyncFunction("requestUsagePermission") {
            requestUsageStatsPermission()
        }

        AsyncFunction("getPermissionStatus") {
            getDetailedPermissionStatus()
        }

        // Data Retrieval - Usage analytics data access
        AsyncFunction("getUsageData") { startDate: String, endDate: String? ->
            getUsageData(startDate, endDate)
        }

        AsyncFunction("getDailySummaries") { startDate: String, endDate: String ->
            getDailySummaries(startDate, endDate)
        }

        // Data Management - Background synchronization
        AsyncFunction("syncDataNow") {
            triggerDataSync()
        }
    }

    // Service Control Implementation
    private fun startMonitoringService(): Boolean {
        return try {
            Log.d(TAG, "Starting monitoring service")
            val intent = Intent(context, MonitoringForegroundService::class.java)
            ContextCompat.startForegroundService(context, intent)
            Log.d(TAG, "Monitoring service start requested successfully")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start monitoring service", e)
            false
        }
    }

    private fun stopMonitoringService(): Boolean {
        return try {
            Log.d(TAG, "Stopping monitoring service")
            val intent = Intent(context, MonitoringForegroundService::class.java)
            context.stopService(intent)
            Log.d(TAG, "Monitoring service stop requested successfully")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop monitoring service", e)
            false
        }
    }



    // Permission Handling Implementation
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
            val hasPermission = mode == AppOpsManager.MODE_ALLOWED
            Log.d(TAG, "Usage stats permission check: $hasPermission")
            hasPermission
        } catch (e: Exception) {
            Log.e(TAG, "Error checking usage stats permission", e)
            false
        }
    }

    private fun requestUsageStatsPermission(): Boolean {
        return try {
            Log.d(TAG, "Requesting usage stats permission")
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val packageUri = Uri.parse("package:${context.packageName}")
                data = packageUri
            }
            context.startActivity(intent)
            Log.d(TAG, "Usage stats settings activity launched")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting usage stats permission", e)
            false
        }
    }

    private fun getDetailedPermissionStatus(): Map<String, Any> {
        val hasPermission = checkUsageStatsPermission()
        return mapOf(
            "usageStatsGranted" to hasPermission,
            "canRequestPermission" to true // Always can request on Android
        )
    }

    // Data Retrieval Implementation
    private fun getUsageData(startDate: String, endDate: String?): List<Map<String, Any?>> {
        return try {
            Log.d(TAG, "Getting usage data from $startDate to ${endDate ?: "now"}")
            val startTime = parseDateToTimestamp(startDate)
            val endTime = endDate?.let { parseDateToTimestamp(it) + (24 * 60 * 60 * 1000) - 1 } ?: System.currentTimeMillis()
            val sessions = repository.getUsageData(startTime, endTime)
            val result = sessions.map { convertUsageSession(it) }
            Log.d(TAG, "Retrieved ${result.size} usage sessions")
            result
        } catch (e: Exception) {
            Log.e(TAG, "Error getting usage data", e)
            emptyList()
        }
    }

    private fun getDailySummaries(startDate: String, endDate: String): List<Map<String, Any>> {
        return try {
            Log.d(TAG, "Getting daily summaries from $startDate to $endDate")
            val summaries = repository.getDailySummaries(startDate, endDate)
            val result = summaries.map { convertDailySummary(it) }
            Log.d(TAG, "Retrieved ${result.size} daily summaries")
            result
        } catch (e: Exception) {
            Log.e(TAG, "Error getting daily summaries", e)
            emptyList()
        }
    }

    private fun triggerDataSync(): Boolean {
        return try {
            Log.d(TAG, "Triggering manual data sync")
            val syncWorkRequest = OneTimeWorkRequestBuilder<DataSyncWorker>().build()
            WorkManager.getInstance(context).enqueue(syncWorkRequest)
            Log.d(TAG, "Data sync work enqueued successfully")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error triggering data sync", e)
            false
        }
    }

    // Utility Functions
    private fun parseDateToTimestamp(dateString: String): Long {
        return try {
            val date = dateFormat.parse(dateString)
            date?.time ?: throw Exception("Date parsing failed")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing date: $dateString", e)
            throw e
        }
    }

    private fun convertUsageSession(session: expo.modules.monitoring.database.AppUsageSession): Map<String, Any?> {
        return mapOf(
            "id" to session.id,
            "appPackage" to session.appPackage,
            "startTime" to session.startTime,
            "endTime" to session.endTime,
            "duration" to session.duration,
            "isActive" to session.isActive
        )
    }

    private fun convertDailySummary(summary: expo.modules.monitoring.database.DailySummary): Map<String, Any> {
        return mapOf(
            "date" to summary.date,
            "totalUsageTime" to summary.totalUsageTime,
            "idleTime" to summary.idleTime,
            "sessionCount" to summary.sessionCount,
            "lastUpdated" to summary.lastUpdated
        )
    }
}
