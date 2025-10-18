package expo.modules.monitoringmobile.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import expo.modules.monitoringmobile.database.MonitoringRepository
import kotlinx.coroutines.runBlocking
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class DataSyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : Worker(context, workerParams) {

    private val repository = MonitoringRepository(context)

    override fun doWork(): Result {
        return try {
            Log.d(TAG, "Starting data synchronization")

            // Perform data synchronization tasks
            val success = runBlocking {
                performDataSync()
            }

            if (success) {
                Log.d(TAG, "Data synchronization completed successfully")
                Result.success()
            } else {
                Log.e(TAG, "Data synchronization failed")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error during data synchronization", e)
            Result.failure()
        }
    }

    private suspend fun performDataSync(): Boolean {
        try {
            // 1. Export data to JSON files
            exportDataToFiles()

            // 2. Cleanup old data (keep last 30 days)
            repository.cleanupOldData(olderThanDays = 30)

            // 3. Compress and prepare for upload (placeholder)
            prepareDataForUpload()

            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error performing data sync", e)
            return false
        }
    }

    private suspend fun exportDataToFiles() {
        try {
            val exportDir = File(applicationContext.filesDir, "monitoring_exports")
            if (!exportDir.exists()) {
                exportDir.mkdirs()
            }

            val timestamp = System.currentTimeMillis()
            val dateFormat = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.getDefault())
            val filename = "monitoring_data_${dateFormat.format(Date(timestamp))}.json"

            val exportFile = File(exportDir, filename)

            // Get data from last 7 days
            val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
            val startDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(sevenDaysAgo))
            val endDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

            val usageData = repository.getUsageData(startDate, endDate)
            val dailySummaries = repository.getDailySummaries(startDate, endDate)
            val screenEvents = repository.getScreenEvents(sevenDaysAgo, System.currentTimeMillis())

            val exportData = mapOf(
                "exportTimestamp" to timestamp,
                "startDate" to startDate,
                "endDate" to endDate,
                "usageSessions" to usageData,
                "dailySummaries" to dailySummaries,
                "screenEvents" to screenEvents
            )

            // Write to JSON file
            FileWriter(exportFile).use { writer ->
                com.google.gson.GsonBuilder()
                    .setPrettyPrinting()
                    .create()
                    .toJson(exportData, writer)
            }

            Log.d(TAG, "Data exported to ${exportFile.absolutePath}")

        } catch (e: Exception) {
            Log.e(TAG, "Error exporting data to files", e)
        }
    }

    private fun prepareDataForUpload() {
        // Placeholder for data upload preparation
        // In a real implementation, this would:
        // - Compress the JSON files
        // - Encrypt sensitive data
        // - Prepare for secure upload to server
        // - Handle network connectivity checks

        Log.d(TAG, "Data prepared for upload (placeholder implementation)")
    }

    companion object {
        private const val TAG = "DataSyncWorker"

        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED) // Only run when connected to network
                .setRequiresBatteryNotLow(true) // Don't run when battery is low
                .build()

            val syncWorkRequest = PeriodicWorkRequestBuilder<DataSyncWorker>(
                24, TimeUnit.HOURS // Run daily
            )
                .setConstraints(constraints)
                .setInitialDelay(1, TimeUnit.HOURS) // First run after 1 hour
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "monitoring_data_sync",
                ExistingPeriodicWorkPolicy.KEEP, // Keep existing if already scheduled
                syncWorkRequest
            )

            Log.d(TAG, "Periodic data sync scheduled")
        }

        fun triggerImmediateSync(context: Context) {
            val syncWorkRequest = OneTimeWorkRequestBuilder<DataSyncWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()

            WorkManager.getInstance(context)
                .enqueue(syncWorkRequest)

            Log.d(TAG, "Immediate data sync triggered")
        }
    }
}