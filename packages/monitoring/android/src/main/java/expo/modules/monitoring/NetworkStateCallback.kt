package expo.modules.monitoring

import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.util.Log
import expo.modules.monitoring.database.MonitoringRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NetworkStateCallback(private val repository: MonitoringRepository) : ConnectivityManager.NetworkCallback() {

    companion object {
        private const val TAG = "NetworkStateCallback"
    }

    private val scope = CoroutineScope(Dispatchers.IO)

    override fun onAvailable(network: Network) {
        super.onAvailable(network)
        val networkType = getNetworkType(network)
        Log.d(TAG, "Network available: $networkType")
        recordNetworkEvent(networkType, System.currentTimeMillis())
    }

    override fun onLost(network: Network) {
        super.onLost(network)
        Log.d(TAG, "Network lost")
        recordNetworkEvent("No network", System.currentTimeMillis())
    }

    private fun getNetworkType(network: Network): String {
        val connectivityManager = repository.context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val capabilities = connectivityManager.getNetworkCapabilities(network)

        return when {
            capabilities == null -> "No network"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WiFi"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "Mobile data"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "Bluetooth"
            else -> "Unknown network type"
        }
    }

    private fun recordNetworkEvent(networkType: String, timestamp: Long) {
        Log.d(TAG, "Network event recorded: $networkType at $timestamp")

        // Store in database
        scope.launch {
            try {
                repository.recordNetworkEvent(networkType, timestamp)
            } catch (e: Exception) {
                Log.e(TAG, "Error recording network event to database", e)
            }
        }
    }
}