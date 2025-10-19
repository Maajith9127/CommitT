package expo.modules.monitoring.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "network_events")
data class NetworkEvent(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val timestamp: Long,
    val networkType: String, // "WiFi", "Mobile data", "Ethernet", "Bluetooth", etc.
    val isConnected: Boolean = true
)