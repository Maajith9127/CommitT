package expo.modules.monitoring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import expo.modules.monitoring.database.MonitoringRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ScreenStateReceiver(private val repository: MonitoringRepository? = null) : BroadcastReceiver() {

    companion object {
        private const val TAG = "ScreenStateReceiver"

        // In-memory storage for fallback when repository is not available
        private var lastScreenOnTime: Long = 0
        private var lastScreenOffTime: Long = 0
        private var lastUserPresentTime: Long = 0
        private var currentSessionStartTime: Long = 0
        private var totalIdleTimeToday: Long = 0
        private var sessionCountToday: Int = 0
    }

    private val scope = CoroutineScope(Dispatchers.IO)

    override fun onReceive(context: Context, intent: Intent) {
        val currentTime = System.currentTimeMillis()

        when (intent.action) {
            Intent.ACTION_SCREEN_ON -> {
                Log.d(TAG, "Screen turned ON at $currentTime")
                handleScreenOn(currentTime)
            }
            Intent.ACTION_SCREEN_OFF -> {
                Log.d(TAG, "Screen turned OFF at $currentTime")
                handleScreenOff(currentTime)
            }
            Intent.ACTION_USER_PRESENT -> {
                Log.d(TAG, "User became present (unlocked) at $currentTime")
                handleUserPresent(currentTime)
            }
            else -> {
                Log.w(TAG, "Received unexpected intent action: ${intent.action}")
            }
        }
    }

    private fun handleScreenOn(timestamp: Long) {
        lastScreenOnTime = timestamp

        // If this is the start of a new session
        if (currentSessionStartTime == 0L) {
            currentSessionStartTime = timestamp
            sessionCountToday++
            Log.d(TAG, "Started new user session #$sessionCountToday")
        }

        // Calculate idle time since last screen off (if applicable)
        if (lastScreenOffTime > 0) {
            val idleTime = timestamp - lastScreenOffTime
            totalIdleTimeToday += idleTime
            Log.d(TAG, "Idle time since screen off: ${idleTime}ms (${idleTime / 1000}s)")

            // Update daily idle time in database
            repository?.let { repo ->
                scope.launch {
                    try {
                        repo.updateDailyIdleTime(idleTime)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error updating daily idle time", e)
                    }
                }
            }
        }

        // Record screen state change
        recordScreenEvent("SCREEN_ON", timestamp)
    }

    private fun handleScreenOff(timestamp: Long) {
        lastScreenOffTime = timestamp

        // Calculate session duration if we have a session start time
        if (currentSessionStartTime > 0) {
            val sessionDuration = timestamp - currentSessionStartTime
            Log.d(TAG, "Session duration: ${sessionDuration}ms (${sessionDuration / 1000}s)")
            // Reset session start time - next screen on will start a new session
            currentSessionStartTime = 0
        }

        // Record screen state change
        recordScreenEvent("SCREEN_OFF", timestamp)
    }

    private fun handleUserPresent(timestamp: Long) {
        lastUserPresentTime = timestamp

        // User unlock typically happens after screen on
        // This indicates active user interaction
        Log.d(TAG, "User unlocked device - active interaction detected")

        // Record user present event
        recordScreenEvent("USER_PRESENT", timestamp)
    }

    private fun recordScreenEvent(eventType: String, timestamp: Long) {
        Log.d(TAG, "Screen event recorded: $eventType at $timestamp")

        // Store in database if repository is available
        repository?.let { repo ->
            scope.launch {
                try {
                    repo.recordScreenEvent(eventType, timestamp)
                } catch (e: Exception) {
                    Log.e(TAG, "Error recording screen event to database", e)
                }
            }
        }
    }

    // Public methods for accessing current state (used by service)
    fun getLastScreenOnTime(): Long = lastScreenOnTime
    fun getLastScreenOffTime(): Long = lastScreenOffTime
    fun getTotalIdleTimeToday(): Long = totalIdleTimeToday
    fun getSessionCountToday(): Int = sessionCountToday
    fun isScreenCurrentlyOn(): Boolean = lastScreenOnTime > lastScreenOffTime

    // Reset daily stats (would be called at midnight)
    fun resetDailyStats() {
        totalIdleTimeToday = 0
        sessionCountToday = 0
        Log.d(TAG, "Daily screen stats reset")
    }
}