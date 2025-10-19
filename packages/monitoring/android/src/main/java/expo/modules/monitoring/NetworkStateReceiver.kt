package expo.modules.monitoring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.util.Log
import expo.modules.monitoring.database.MonitoringRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NetworkStateReceiver(private val repository: MonitoringRepository? = null) : BroadcastReceiver() {

    companion object {
        private const val TAG = "NetworkStateReceiver"
    }

    private val scope = CoroutineScope(Dispatchers.IO)

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ConnectivityManager.CONNECTIVITY_ACTION) {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val currentTime = System.currentTimeMillis()

            val networkInfo = getNetworkInfo(connectivityManager)
            Log.d(TAG, "Network state changed at $currentTime: $networkInfo")

            // Record network event
            recordNetworkEvent(networkInfo, currentTime)
        }
    }

    private fun getNetworkInfo(connectivityManager: ConnectivityManager): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)

            when {
                capabilities == null -> "No network"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WiFi"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "Mobile data"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "Bluetooth"
                else -> "Unknown network type"
            }
        } else {
            @Suppress("DEPRECATION")
            val activeNetworkInfo = connectivityManager.activeNetworkInfo
            when (activeNetworkInfo?.type) {
                ConnectivityManager.TYPE_WIFI -> "WiFi"
                ConnectivityManager.TYPE_MOBILE -> "Mobile data"
                ConnectivityManager.TYPE_ETHERNET -> "Ethernet"
                ConnectivityManager.TYPE_BLUETOOTH -> "Bluetooth"
                else -> "Unknown or no network"
            }
        }
    }

    private fun recordNetworkEvent(networkType: String, timestamp: Long) {
        Log.d(TAG, "Network event recorded: $networkType at $timestamp")

        // Store in database if repository is available
        repository?.let { repo ->
            scope.launch {
                try {
                    repo.recordNetworkEvent(networkType, timestamp)
                } catch (e: Exception) {
                    Log.e(TAG, "Error recording network event to database", e)
                }
            }
        }
    }
}