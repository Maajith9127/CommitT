package expo.modules.monitoring.database

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class MonitoringRepository(context: Context) {

    private val database = MonitoringDatabase.getInstance(context)
    private val appUsageDao = database.appUsageSessionDao()
    private val screenEventDao = database.screenEventDao()
    private val dailySummaryDao = database.dailySummaryDao()
    private val networkEventDao = database.networkEventDao()

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    // App Usage Session Management
    suspend fun startAppSession(packageName: String): Long? = withContext(Dispatchers.IO) {
        try {
            // Check if there's already an active session for this app
            val existingSession = appUsageDao.getActiveSession(packageName)
            if (existingSession != null) {
                Log.w(TAG, "Active session already exists for $packageName")
                return@withContext null
            }

            val session = AppUsageSession(
                appPackage = packageName,
                startTime = System.currentTimeMillis(),
                isActive = true
            )
            val sessionId = appUsageDao.insert(session)
            Log.d(TAG, "Started session for $packageName with ID: $sessionId")
            sessionId
        } catch (e: Exception) {
            Log.e(TAG, "Error starting app session for $packageName", e)
            null
        }
    }

    suspend fun endAppSession(packageName: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val session = appUsageDao.getActiveSession(packageName)
            if (session == null) {
                Log.w(TAG, "No active session found for $packageName")
                return@withContext false
            }

            val endTime = System.currentTimeMillis()
            val duration = endTime - session.startTime

            val updatedSession = session.copy(
                endTime = endTime,
                duration = duration,
                isActive = false
            )

            appUsageDao.update(updatedSession)

            // Update daily summary
            updateDailySummary(session.startTime, duration)

            Log.d(TAG, "Ended session for $packageName, duration: ${duration}ms")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error ending app session for $packageName", e)
            false
        }
    }

    // Screen Event Management
    suspend fun recordScreenEvent(eventType: String, timestamp: Long = System.currentTimeMillis()): Long? = withContext(Dispatchers.IO) {
        try {
            val event = ScreenEvent(
                timestamp = timestamp,
                eventType = eventType
            )
            val eventId = screenEventDao.insert(event)
            Log.d(TAG, "Recorded screen event: $eventType at $timestamp")
            eventId
        } catch (e: Exception) {
            Log.e(TAG, "Error recording screen event: $eventType", e)
            null
        }
    }

    // Network Event Management
    suspend fun recordNetworkEvent(networkType: String, timestamp: Long = System.currentTimeMillis()): Long? = withContext(Dispatchers.IO) {
        try {
            val event = NetworkEvent(
                timestamp = timestamp,
                networkType = networkType
            )
            val eventId = networkEventDao.insert(event)
            Log.d(TAG, "Recorded network event: $networkType at $timestamp")
            eventId
        } catch (e: Exception) {
            Log.e(TAG, "Error recording network event: $networkType", e)
            null
        }
    }

    // Daily Summary Management
    private suspend fun updateDailySummary(sessionStartTime: Long, duration: Long) {
        try {
            val date = dateFormat.format(Date(sessionStartTime))
            val existingSummary = dailySummaryDao.getByDate(date)

            if (existingSummary == null) {
                // Create new daily summary
                val newSummary = DailySummary(
                    date = date,
                    totalUsageTime = duration,
                    sessionCount = 1
                )
                dailySummaryDao.insertOrUpdate(newSummary)
            } else {
                // Update existing summary
                dailySummaryDao.addUsageTime(date, duration, System.currentTimeMillis())
                dailySummaryDao.incrementSessionCount(date, System.currentTimeMillis())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating daily summary", e)
        }
    }

    suspend fun updateDailyIdleTime(idleTimeMs: Long) {
        withContext(Dispatchers.IO) {
            try {
                val date = dateFormat.format(Date())
                val existingSummary = dailySummaryDao.getByDate(date)

                if (existingSummary == null) {
                    val newSummary = DailySummary(
                        date = date,
                        idleTime = idleTimeMs
                    )
                    dailySummaryDao.insertOrUpdate(newSummary)
                } else {
                    dailySummaryDao.addIdleTime(date, idleTimeMs, System.currentTimeMillis())
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating daily idle time", e)
            }
        }
    }

    // Data Retrieval Methods
    suspend fun getUsageData(startDate: String, endDate: String): List<AppUsageSession> = withContext(Dispatchers.IO) {
        try {
            val startTime = parseDateToTimestamp(startDate)
            val endTime = parseDateToTimestamp(endDate) + (24 * 60 * 60 * 1000) - 1 // End of day
            appUsageDao.getSessionsInTimeRange(startTime, endTime)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting usage data", e)
            emptyList()
        }
    }

    suspend fun getDailySummaries(startDate: String, endDate: String): List<DailySummary> = withContext(Dispatchers.IO) {
        try {
            dailySummaryDao.getSummariesInRange(startDate, endDate)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting daily summaries", e)
            emptyList()
        }
    }

    suspend fun getScreenEvents(startTime: Long, endTime: Long): List<ScreenEvent> = withContext(Dispatchers.IO) {
        try {
            screenEventDao.getEventsInTimeRange(startTime, endTime)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting screen events", e)
            emptyList()
        }
    }

    // Cleanup Methods
    suspend fun cleanupOldData(olderThanDays: Int = 30) {
        withContext(Dispatchers.IO) {
            try {
                val cutoffTime = System.currentTimeMillis() - (olderThanDays * 24 * 60 * 60 * 1000L)

                val deletedScreenEvents = screenEventDao.deleteOldEvents(cutoffTime)
                val deletedNetworkEvents = networkEventDao.deleteOldEvents(cutoffTime)

                Log.d(TAG, "Cleaned up $deletedScreenEvents screen events and $deletedNetworkEvents network events older than $olderThanDays days")
            } catch (e: Exception) {
                Log.e(TAG, "Error during data cleanup", e)
            }
        }
    }

    private fun parseDateToTimestamp(dateString: String): Long {
        return try {
            val date = dateFormat.parse(dateString)
            date?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing date: $dateString", e)
            System.currentTimeMillis()
        }
    }

    companion object {
        private const val TAG = "MonitoringRepository"
    }
}