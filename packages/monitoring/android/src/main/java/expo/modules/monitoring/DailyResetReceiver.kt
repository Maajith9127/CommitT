package expo.modules.monitoring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.Calendar
import expo.modules.monitoring.database.MonitoringRepository

class DailyResetReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "DailyResetReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_DATE_CHANGED -> {
                Log.d(TAG, "Date changed, resetting daily stats")
                resetDailyStats(context)
            }
        }
    }

    private fun resetDailyStats(context: Context) {
        // This is a bit of a hack, but it's the only way to access the
        // ScreenStateReceiver instance without making it a singleton.
        val screenStateReceiver = ScreenStateReceiver(database.MonitoringRepository(context))
        screenStateReceiver.resetDailyStats()
    }
}